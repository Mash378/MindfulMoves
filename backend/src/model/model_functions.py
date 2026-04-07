import torch
import re
import chess
import random
from transformers import AutoTokenizer, AutoModelForCausalLM
from pathlib import Path

MODEL_PATH = str(Path(__file__).parent / "ChessGPT-4.5M").replace("\\", "/")
print(f"Loading model from {MODEL_PATH}...")

# tokenizer = AutoTokenizer.from_pretrained("gpt2")

# new_tokens = [
#     "<|moves|>", "<|target|>",
#     "<ELO:1500-1700>",
#     "<PHASE:Opening>", "<PHASE:Middlegame>", "<PHASE:Endgame>",
#     "<STYLE:Tactical>", "<STYLE:Aggressive>", "<STYLE:Solid>",
#     "<STYLE:Defensive>", "<STYLE:Balanced>",
#     "<ERR:Good>", "<ERR:Inaccuracy>", "<ERR:Mistake>", "<ERR:Blunder>",
# ]
# tokenizer.add_tokens(new_tokens)

# if tokenizer.pad_token is None:
#     tokenizer.pad_token = tokenizer.eos_token
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model  = AutoModelForCausalLM.from_pretrained(MODEL_PATH)
model.resize_token_embeddings(len(tokenizer))
model  = model.to(device)
model.eval()

TARGET_ID = tokenizer.convert_tokens_to_ids("<|target|>")
print(f"✓ Model loaded on {device} | Vocab: {len(tokenizer)}")

UCI_RE = re.compile(r"^[a-h][1-8][a-h][1-8][qrbn]?$")

def is_valid_uci(move: str) -> bool:
    return bool(UCI_RE.match(move))

def board_from_history(moves: list) -> chess.Board:
    board = chess.Board()
    for m in moves:
        board.push_uci(m)
    return board

def build_prompt(
    move_history: list,
    elo_group:    str = "1500-1700",
    phase:        str = "Opening",
    style:        str = "Balanced",
    error_level:  str = "Good",
) -> str:
    ctx = " ".join(move_history)
    return (
        f"<ELO:{elo_group}> <PHASE:{phase}> <STYLE:{style}> <ERR:{error_level}> "
        f"<|moves|> {ctx} <|target|>"
    )

def predict_next_move(
    move_history:    list,
    elo_group:       str   = "1500-1700",
    phase:           str   = "Opening",
    style:           str   = "Balanced",
    error_level:     str   = "Good",
    temperature:     float = 1.0,
    top_p:           float = 0.95,
    max_move_tokens: int   = 6,
    enforce_legal:   bool  = True,
    max_retries:     int   = 5,
) -> str:
    dev          = next(model.parameters()).device
    prompt       = build_prompt(move_history, elo_group, phase, style, error_level)
    inputs       = tokenizer(prompt, return_tensors="pt")
    inputs       = {k: v.to(dev) for k, v in inputs.items()}
    input_length = inputs["input_ids"].shape[1]

    try:
        board = board_from_history(move_history)
    except Exception:
        board = None

    for attempt in range(max_retries):
        t = min(temperature * (1 + 0.3 * attempt), 3.0)
        with torch.no_grad():
            output = model.generate(
                **inputs,
                max_new_tokens = max_move_tokens,
                do_sample      = (t > 0.01),
                temperature    = max(t, 0.01),
                top_p          = top_p,
                pad_token_id   = tokenizer.pad_token_id,
                eos_token_id   = tokenizer.eos_token_id,
            )
        generated = tokenizer.decode(
            output[0][input_length:], skip_special_tokens=True
        ).strip()

        move = ""
        for length in (5, 4):
            candidate = generated[:length].strip()
            if is_valid_uci(candidate):
                move = candidate
                break
        if not move:
            for token in generated.split():
                if is_valid_uci(token):
                    move = token
                    break
        if not move:
            continue
        if enforce_legal and board is not None:
            try:
                if chess.Move.from_uci(move) not in board.legal_moves:
                    continue
            except Exception:
                continue
        return move

    if enforce_legal and board is not None:
        legal = list(board.legal_moves)
        if legal:
            return random.choice(legal).uci()
    return ""


ELO_PROFILE = {
    "1500": (0.5, 0.25, 0.15, 0.1),
    "1600": (0.7, 0.20, 0.10, 0.05),
    "1700": (0.8, 0.1, 0.06, 0.04),
}
ERROR_NAMES      = ["Good", "Inaccuracy", "Mistake", "Blunder"]
TEMPS            = {"Good": 0.3, "Inaccuracy": 0.8, "Mistake": 1.2, "Blunder": 1.5}
STYLE_TEMP_NUDGE = {
    "Tactical":   +0.2,
    "Aggressive": +0.3,
    "Solid":      -0.1,
    "Defensive":  -0.2,
    "Balanced":    0.0,
}
STYLE_ERROR_NUDGE = {
    "Tactical":   (-0.10, +0.05, +0.03, +0.02),
    "Aggressive": (-0.15, +0.05, +0.05, +0.05),
    "Solid":      (+0.05, +0.00, -0.03, -0.02),
    "Defensive":  (+0.08, +0.00, -0.04, -0.04),
    "Balanced":   ( 0.00,  0.00,  0.00,  0.00),
}

def sample_error_level(
    target_elo: int = 1600,
    phase:      str = "Middlegame",
    style:      str = "Balanced",
) -> str:
    key   = str(round(target_elo, -2))
    key   = key if key in ELO_PROFILE else "1600"
    probs = list(ELO_PROFILE[key])
    if phase == "Middlegame":
        probs[0] -= 0.03
        probs[2] += 0.02
        probs[3] += 0.01
    nudge = STYLE_ERROR_NUDGE.get(style, (0, 0, 0, 0))
    probs = [max(0.01, p + n) for p, n in zip(probs, nudge)]
    total = sum(probs)
    probs = [p / total for p in probs]
    return random.choices(ERROR_NAMES, weights=probs, k=1)[0]

def infer_phase(move_history: list) -> str:
    n = len(move_history)
    if n < 10: return "Opening"
    if n > 40: return "Endgame"
    return "Middlegame"

# ── Human move feedback ───────────────────────────────────────────────────────
PIECE_VALUES = {
    chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
    chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0,
}

def score_board(board: chess.Board, color: chess.Color) -> float:
    """Simple material count from `color`'s perspective."""
    score = 0
    for piece_type, value in PIECE_VALUES.items():
        score += value * len(board.pieces(piece_type, color))
        score -= value * len(board.pieces(piece_type, not color))
    return score

def evaluate_human_move(
    move_history_before: list,
    uci: str,
    player_color: str = "white",
) -> str:
    """
    Compares the played move against the model's top suggestion.
    Returns 'Good', 'Inaccuracy', 'Mistake', or 'Blunder'.
    """
    try:
        color = chess.WHITE if player_color == "white" else chess.BLACK
        board_before = board_from_history(move_history_before)

        # Score after the human's actual move
        board_after_human = board_before.copy()
        board_after_human.push_uci(uci)
        human_score = score_board(board_after_human, color)

        # Score after the model's suggested best move
        best_uci = predict_next_move(
            move_history_before,
            phase=infer_phase(move_history_before),
            style="Balanced",
            error_level="Good",
            temperature=0.1,          # low temp → greedy/best move
            enforce_legal=True,
        )
        if best_uci and best_uci != uci:
            board_after_best = board_before.copy()
            board_after_best.push_uci(best_uci)
            best_score = score_board(board_after_best, color)
            delta = best_score - human_score  # how much worse than best
        else:
            delta = 0.0  # played the suggested move

        if delta <= 0:     return "Good"
        elif delta < 1:    return "Inaccuracy"
        elif delta < 3:    return "Mistake"
        else:              return "Blunder"

    except Exception:
        return "Good"   # fail safe — don't break the game