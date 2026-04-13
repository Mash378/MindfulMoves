import uuid

import chess
from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.models.game import Game, GameStatus, STARTING_FEN
from src.db.models.move import Move
from src.db.models.user import User
from src.features.game.ai.engine import get_ai_move, get_ai_move_elo


class NewGameResponse(BaseModel):
    game_id: str
    fen: str
    status: str


class MakeMoveRequest(BaseModel):
    uci: str
    current_fen: str
    bot_style:  str | None = None
    target_elo: int | None = None


class MakeMoveResponse(BaseModel):
    player_uci: str
    ai_uci: str | None
    fen: str
    status: str
    game_over: bool


class GameStateResponse(BaseModel):
    game_id: str
    fen: str
    status: str
    move_count: int


class UndoMoveResponse(BaseModel):
    fen: str
    status: str
    move_count: int


def _resolve_status_after(board: chess.Board, player_won: bool) -> GameStatus:
    """Return the terminal GameStatus for the given board position."""
    if board.is_checkmate():
        return GameStatus.white_wins if player_won else GameStatus.black_wins
    # All draw conditions
    if (
        board.is_stalemate()
        or board.is_insufficient_material()
        or board.is_seventyfive_moves()
        or board.is_fivefold_repetition()
    ):
        return GameStatus.draw
    return GameStatus.active


def _update_user_stats(user: User, result: GameStatus) -> None:
    games_played = (user.games_played or 0) + 1
    games_won = (user.games_won or 0) + (1 if result == GameStatus.white_wins else 0)
    user.games_played = games_played  # type: ignore
    user.games_won = games_won  # type: ignore
    user.win_rate = round((games_won / games_played) * 100)  # type: ignore

    # Simple ELO update (player is always white, AI treated as fixed 400 ELO)
    player_elo = user.elo_rating or 400
    ai_elo = 400
    outcome = (
        1.0
        if result == GameStatus.white_wins
        else (0.5 if result == GameStatus.draw else 0.0)
    )
    expected = 1 / (1 + 10 ** ((ai_elo - player_elo) / 400))  # type: ignore
    user.elo_rating = max(0, player_elo + round(32 * (outcome - expected)))  # type: ignore


def create_game(user_id: str, db: Session) -> NewGameResponse:
    game = Game(
        id=str(uuid.uuid4()),
        user_id=user_id,
        status=GameStatus.active,
        current_fen=STARTING_FEN,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return NewGameResponse(
        game_id=str(game.id), fen=str(game.current_fen), status=game.status.value
    )


def make_move(
    game_id: str, body: MakeMoveRequest, user_id: str, db: Session
) -> MakeMoveResponse:
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )

    if str(game.user_id) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if game.status != GameStatus.active:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="Game is already over"
        )

    if body.current_fen != str(game.current_fen):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Board out of sync",
                "server_fen": str(game.current_fen),
            },
        )

    # Validate and apply player move
    board = chess.Board(str(game.current_fen))
    try:
        player_move = chess.Move.from_uci(body.uci)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Not a UCI move",
        )

    if player_move not in board.legal_moves:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Illegal move"
        )

    board.push(player_move)
    fen_after_player = board.fen()

    # Check game-over after player's move
    move_number = db.query(Move).filter(Move.game_id == game_id).count() + 1
    new_status = _resolve_status_after(board, player_won=True)

    ai_uci_str: str | None = None
    fen_after_ai: str | None = None

    if new_status == GameStatus.active:
        if body.target_elo is not None:
            # ELO mode: build flat UCI history from DB records + current player move
            uci_history: list[str] = []
            try:
                previous_moves = (
                    db.query(Move)
                    .filter(Move.game_id == game_id)
                    .order_by(Move.move_number.asc())
                    .all()
                )
                for m in previous_moves:
                    uci_history.append(str(m.player_uci))
                    if m.ai_uci:
                        uci_history.append(str(m.ai_uci))
                uci_history.append(body.uci)
            except Exception:
                uci_history = [body.uci]

            ai_uci_str = get_ai_move_elo(
                fen_after_player,
                uci_history,
                str(body.bot_style),
                int(body.target_elo),
            )
        else:
            # Magnus mode: build SAN history from persisted UCI moves + current player move
            san_history: list[str] = []
            try:
                history_board = chess.Board()
                previous_moves = (
                    db.query(Move)
                    .filter(Move.game_id == game_id)
                    .order_by(Move.move_number.asc())
                    .all()
                )
                for m in previous_moves:
                    player_mv = chess.Move.from_uci(str(m.player_uci))
                    san_history.append(history_board.san(player_mv))
                    history_board.push(player_mv)
                    if m.ai_uci:
                        ai_mv = chess.Move.from_uci(str(m.ai_uci))
                        san_history.append(history_board.san(ai_mv))
                        history_board.push(ai_mv)
                san_history.append(history_board.san(player_move))
            except Exception:
                san_history = []

            ai_uci_str = get_ai_move(fen_after_player, san_history)

        if ai_uci_str is None:
            # No legal moves for AI — treat as draw
            new_status = GameStatus.draw
        else:
            board.push(chess.Move.from_uci(ai_uci_str))
            fen_after_ai = board.fen()
            new_status = _resolve_status_after(board, player_won=False)

    final_fen = fen_after_ai if fen_after_ai else fen_after_player

    # Persist move record and update game state
    move_record = Move(
        id=str(uuid.uuid4()),
        game_id=game_id,
        move_number=move_number,
        player_uci=body.uci,
        ai_uci=ai_uci_str,
        fen_after_player=fen_after_player,
        fen_after_ai=fen_after_ai,
    )
    db.add(move_record)

    game.current_fen = final_fen  # type: ignore
    game.status = new_status  # type: ignore

    # Update user stats on game over
    if new_status != GameStatus.active:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            _update_user_stats(user, new_status)

    db.commit()

    return MakeMoveResponse(
        player_uci=body.uci,
        ai_uci=ai_uci_str,
        fen=final_fen,
        status=new_status.value,
        game_over=new_status != GameStatus.active,
    )


def undo_move(game_id: str, user_id: str, db: Session) -> UndoMoveResponse:
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    if str(game.user_id) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if game.status != GameStatus.active:  # type: ignore
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot undo on a finished game")

    last_move = (
        db.query(Move)
        .filter(Move.game_id == game_id)
        .order_by(Move.move_number.desc())
        .first()
    )
    if not last_move:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No moves to undo")

    if last_move.move_number > 1:
        prior_move = (
            db.query(Move)
            .filter(Move.game_id == game_id, Move.move_number == last_move.move_number - 1)
            .first()
        )
        if prior_move is None or prior_move.fen_after_ai is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot undo")
        restored_fen = str(prior_move.fen_after_ai)
    else:
        restored_fen = STARTING_FEN

    db.delete(last_move)
    game.current_fen = restored_fen  # type: ignore
    db.commit()

    remaining_count = db.query(Move).filter(Move.game_id == game_id).count()
    return UndoMoveResponse(fen=restored_fen, status=GameStatus.active.value, move_count=remaining_count)


def get_game_state(game_id: str, user_id: str, db: Session) -> GameStateResponse:
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )

    if str(game.user_id) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    move_count = db.query(Move).filter(Move.game_id == game_id).count()

    return GameStateResponse(
        game_id=str(game.id),
        fen=str(game.current_fen),
        status=game.status.value,
        move_count=move_count,
    )
