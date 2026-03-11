import chess
import random
from src.model.model_functions import (
    predict_next_move, infer_phase, sample_error_level, TEMPS, STYLE_TEMP_NUDGE
)

sessions: dict = {}

def make_session(player_color, bot_style, target_elo):
    return {
        "board":        chess.Board(),
        "history":      [],
        "move_log":     [],
        "player_color": player_color.lower(),
        "bot_color":    "black" if player_color.lower() == "white" else "white",
        "bot_style":    bot_style,
        "target_elo":   target_elo,
    }

def board_state(session):
    board = session["board"]
    return {
        "fen":          board.fen(),
        "turn":         "white" if board.turn == chess.WHITE else "black",
        "is_check":     board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "is_game_over": board.is_game_over(),
        "result":       board.result() if board.is_game_over() else None,
        "history":      session["history"],
        "move_log":     session["move_log"],
        "legal_moves":  [m.uci() for m in board.legal_moves],
    }

def get_bot_move(session):
    history    = session["history"]
    board      = session["board"]
    bot_style  = session["bot_style"]
    target_elo = session["target_elo"]

    phase       = infer_phase(history)
    error_level = sample_error_level(target_elo, phase)
    temperature = max(TEMPS[error_level] + STYLE_TEMP_NUDGE.get(bot_style, 0.0), 0.1)

    move = predict_next_move(
        history, style=bot_style, error_level=error_level,
        temperature=temperature, enforce_legal=True,
    )
    if not move:
        legal = list(board.legal_moves)
        if legal:
            return random.choice(legal).uci(), "Random"
    return move, error_level