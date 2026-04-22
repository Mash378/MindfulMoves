import chess
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.db.database import get_db
from src.db.models.game import Game, GameStatus
from src.db.models.user import User
from src.middleware.auth import get_current_user
from src.features.game.game_controller import (
    GameStateResponse,
    MakeMoveRequest,
    MakeMoveResponse,
    NewGameResponse,
    _update_user_stats,
    create_game,
    get_game_state,
    make_move,
)

router = APIRouter(prefix="/game", tags=["game"])

# Add this request model
class NewGameRequest(BaseModel):
    difficulty: str = "medium"  # default to medium if not specified


@router.post("/new", response_model=NewGameResponse)
def new_game(
    request: NewGameRequest, 
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    return create_game(
        current_user["user_id"], 
        request.difficulty,  
        db
    )


@router.post("/{game_id}/move", response_model=MakeMoveResponse)
def move(
    game_id: str,
    body: MakeMoveRequest,
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    return make_move(game_id, body, current_user["user_id"], db)


@router.get("/{game_id}", response_model=GameStateResponse)
def game_state(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    return get_game_state(game_id, current_user["user_id"], db)


@router.post("/{game_id}/end")
def end_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    """End a game and update stats (for stalemate, timeout, etc.)"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if str(game.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # If game already over, just return current status
    if game.status != GameStatus.active:
        return {"status": game.status.value, "game_over": True}
    
    # Parse the board to determine outcome
    board = chess.Board(game.current_fen)
    
    # Determine final status
    if board.is_checkmate():
        # If it's checkmate, the player who just moved won
        # Since player is always white, check if white is in checkmate
        if board.turn == chess.WHITE:  # White to move but in checkmate = White lost
            game.status = GameStatus.black_wins
        else:
            game.status = GameStatus.white_wins
    elif board.is_stalemate() or board.is_insufficient_material():
        game.status = GameStatus.draw
    else:
        # Default to draw if no clear outcome
        game.status = GameStatus.draw
    
    db.commit()
    
    # Update user stats
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        _update_user_stats(user, game.status)
    
    return {
        "status": game.status.value,
        "fen": game.current_fen,
        "game_over": True
    }

@router.post("/{game_id}/timeout")
def timeout_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    """Handle game timeout - player loses"""
    from src.features.game.game_controller import _update_user_stats
    
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if str(game.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    if game.status != GameStatus.active:
        return {"status": game.status.value}
    
    # Player ran out of time = AI wins
    game.status = GameStatus.black_wins
    db.commit()
    
    # Update user stats (THIS IS WHAT UPDATES THE DATABASE)
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        _update_user_stats(user, GameStatus.black_wins)
        db.commit()  # Commit the stats changes
    
    return {"status": game.status.value, "game_over": True}