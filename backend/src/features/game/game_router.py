from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.middleware.auth import get_current_user
from src.features.game.game_controller import (
    GameStateResponse,
    MakeMoveRequest,
    MakeMoveResponse,
    NewGameResponse,
    UndoMoveResponse,
    create_game,
    get_game_state,
    make_move,
    undo_move,
)

router = APIRouter(prefix="/game", tags=["game"])


@router.post("/new", response_model=NewGameResponse)
def new_game(
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    return create_game(current_user["user_id"], db)


@router.post("/{game_id}/move", response_model=MakeMoveResponse)
def move(
    game_id: str,
    body: MakeMoveRequest,
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    return make_move(game_id, body, current_user["user_id"], db)


@router.post("/{game_id}/undo", response_model=UndoMoveResponse)
def undo(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    return undo_move(game_id, current_user["user_id"], db)


@router.get("/{game_id}", response_model=GameStateResponse)
def game_state(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: dict[str, str] = Depends(get_current_user),
):
    return get_game_state(game_id, current_user["user_id"], db)
