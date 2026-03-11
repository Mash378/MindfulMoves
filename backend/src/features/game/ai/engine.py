import random

import chess


def get_ai_move(fen: str) -> str | None:
    """
    Given a FEN string, return the AI's chosen move in UCI notation,
    or None if there are no legal moves (game already over).

    Placeholder implementation: returns a random legal move.
    Replace this body with AI late
    """
    board = chess.Board(fen)
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return None
    return random.choice(legal_moves).uci()
