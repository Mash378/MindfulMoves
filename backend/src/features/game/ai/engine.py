import logging
import random
from pathlib import Path
from typing import Any
from src.magnusChessGPT.model_wrapper import ChessModel
import chess
from src.data.env import server_env
from src.model.model_functions import (
    predict_next_move,
    infer_phase,
    sample_error_level,
    TEMPS,
    STYLE_TEMP_NUDGE,
)

logger = logging.getLogger(__name__)
model: ChessModel | None = None
model_load_error: Exception | None = None
try:
    model = ChessModel(
        str(Path(__file__).resolve().parents[3] / "magnusChessGPT" / "modelConfig")
    )
except Exception as exc:
    model_load_error = exc
    model = None
logger.warning(
    "Magnus AI model unavailable (load error: %s) — using random legal move",
    model_load_error,
)


def _random_legal_move(board: chess.Board) -> str | None:
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return None
    return random.choice(legal_moves).uci()


def get_ai_move(fen: str, move_history: list[str] | None = None) -> str | None:
    """
    Given a FEN string, return the AI's chosen move in UCI notation,
    or None if there are no legal moves (game already over).

    Tries the finetuned model first, falls back to random legal move.
    """
    board = chess.Board(fen)
    if not list(board.legal_moves):
        return None

    if model is None:
        logger.warning(
            "Magnus AI model unavailable (load error: %s) — using random legal move",
            model_load_error,
        )
        return _random_legal_move(board)

    history = move_history or []

    try:
        prediction = model.predict(history)
    except Exception as exc:
        logger.warning(
            "Magnus AI model prediction raised an exception (%s) — using random legal move",
            exc,
        )
        return _random_legal_move(board)

    san_move = prediction.get("move") if isinstance(prediction, dict) else None
    if not san_move:
        logger.warning(
            "Magnus AI model returned no move (prediction: %r) — using random legal move",
            prediction,
        )
        return _random_legal_move(board)

    try:
        move = board.parse_san(san_move)
        return move.uci()
    except (chess.InvalidMoveError, chess.IllegalMoveError, ValueError) as exc:
        logger.warning(
            "AI move '%s' is invalid/illegal (%s) — using random legal move",
            san_move,
            exc,
        )
        return _random_legal_move(board)


def get_ai_move_elo(
    fen: str,
    uci_history: list[str],
    bot_style: str,
    target_elo: int,
) -> str | None:
    """
    ELO-mode AI: uses the ChessGPT-4.5M transformer conditioned on style/ELO.
    uci_history: flat list of all UCI moves in game order (player + bot interleaved),
                 including the current player move.
    Returns UCI string, or None if there are no legal moves.
    """
    board = chess.Board(fen)
    if not list(board.legal_moves):
        return None

    try:
        phase = infer_phase(uci_history)
        error_level = sample_error_level(target_elo, phase)
        temperature = max(
            TEMPS[error_level] + STYLE_TEMP_NUDGE.get(bot_style, 0.0), 0.1
        )
        move = predict_next_move(
            uci_history,
            style=bot_style,
            error_level=error_level,
            temperature=temperature,
            enforce_legal=True,
        )
        if move:
            return move
    except Exception as exc:
        logger.warning(
            "ELO AI prediction failed (%s) — using random legal move", exc
        )

    return _random_legal_move(board)
