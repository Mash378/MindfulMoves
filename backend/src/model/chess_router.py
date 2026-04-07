from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import chess
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Import model functions
from src.model.model_functions import (
    predict_next_move,
    infer_phase,
    sample_error_level,
    evaluate_human_move,
    TEMPS,
    STYLE_TEMP_NUDGE,
)
from src.model.game_session import sessions, make_session, board_state, get_bot_move

router = APIRouter(prefix="/chess", tags=["chess"])
_executor = ThreadPoolExecutor(max_workers=2)

ELO_TO_SKILL = {1500: 3, 1600: 5, 1700: 7, 1800: 9}


class NewGameRequest(BaseModel):
    player_color:  str = "white"
    bot_style:     str = "Balanced"
    target_elo:    int = 1600

class MoveRequest(BaseModel):
    session_id:  str
    uci:         Optional[str] = None
    from_square: Optional[str] = None
    to_square:   Optional[str] = None
    promotion:   Optional[str] = None

class FeedbackRequest(BaseModel):
    session_id:    str
    uci:           str
    player_color:  str = "white"

@router.post("/game/feedback")
async def get_move_feedback(req: FeedbackRequest):
    if req.session_id not in sessions:
        raise HTTPException(404, "Session not found")

    session        = sessions[req.session_id]
    history_before = session["history"][:-1]   # history before this move

    loop    = asyncio.get_event_loop()
    quality = await loop.run_in_executor(
        _executor,
        evaluate_human_move,
        history_before,
        req.uci,
        req.player_color,
    )
    return {"uci": req.uci, "quality": quality}

class ResetRequest(BaseModel):
    session_id: str
    bot_style:  Optional[str] = None
    target_elo: Optional[int] = None

#routers
@router.post("/game/new")
def new_game(req: NewGameRequest):
    valid_styles = {"Tactical", "Aggressive", "Solid", "Defensive", "Balanced"}
    if req.bot_style not in valid_styles:
        raise HTTPException(400, f"bot_style must be one of {valid_styles}")
    if req.player_color not in ("white", "black"):
        raise HTTPException(400, "player_color must be 'white' or 'black'")
    if req.target_elo not in ELO_TO_SKILL:
        raise HTTPException(400, f"target_elo must be one of {list(ELO_TO_SKILL.keys())}")

    session_id           = str(uuid.uuid4())
    session              = make_session(req.player_color, req.bot_style, req.target_elo)
    sessions[session_id] = session

    response = {
        "session_id":   session_id,
        "board":        board_state(session),
        "player_color": req.player_color,
        "bot_style":    req.bot_style,
        "target_elo":   req.target_elo,
    }

    # Bot opens if player is black
    if req.player_color == "black":
        move, error_level = get_bot_move(session)
        if move:
            session["board"].push(chess.Move.from_uci(move))
            session["history"].append(move)
            session["move_log"].append({
                "move": move, "color": session["bot_color"],
                "type": "bot", "quality": error_level,
                "style": req.bot_style,
            })
            response["bot_opening_move"] = {"move": move, "error_level": error_level}
            response["board"] = board_state(session)

    return response


@router.post("/game/move")
def make_move(req: MoveRequest):
    if req.session_id not in sessions:
        raise HTTPException(404, "Session not found. Call POST /chess/game/new first.")

    session = sessions[req.session_id]
    board   = session["board"]

    # Build UCI
    if req.uci:
        uci = req.uci.strip().lower()
    elif req.from_square and req.to_square:
        promo = req.promotion.lower() if req.promotion else ""
        uci   = f"{req.from_square.lower()}{req.to_square.lower()}{promo}"
    else:
        raise HTTPException(400, "Provide either 'uci' or 'from_square'+'to_square'")

    # Validate
    try:
        move_obj = chess.Move.from_uci(uci)
    except Exception:
        raise HTTPException(400, f"'{uci}' is not valid UCI notation")

    if move_obj not in board.legal_moves:
        raise HTTPException(400, {
            "error":       "illegal_move",
            "message":     f"{uci} is not legal",
            "legal_moves": sorted([m.uci() for m in board.legal_moves]),
        })

    # Apply human move
    board.push(move_obj)
    session["history"].append(uci)
    session["move_log"].append({
        "move": uci, "color": session["player_color"],
        "type": "human", "quality": None,
    })

    response = {
        "status":     "ok",
        "human_move": uci,
        "bot_move":   None,
        "board":      board_state(session),
    }

    if board.is_game_over():
        response["status"] = "game_over"
        return response

    # Bot responds
    bot_uci, error_level = get_bot_move(session)
    if bot_uci:
        board.push(chess.Move.from_uci(bot_uci))
        session["history"].append(bot_uci)
        session["move_log"].append({
            "move": bot_uci, "color": session["bot_color"],
            "type": "bot", "quality": error_level,
            "style": session["bot_style"],
        })
        response["bot_move"] = {
            "move":        bot_uci,
            "from_square": bot_uci[:2],
            "to_square":   bot_uci[2:4],
            "promotion":   bot_uci[4] if len(bot_uci) == 5 else None,
            "error_level": error_level,
            "style":       session["bot_style"],
        }
        response["board"] = board_state(session)
        if board.is_game_over():
            response["status"] = "game_over"
    print(f"DEBUG: [Transformer Model] move called for session {req.session_id}")
    return response


@router.get("/game/state")
def get_state(session_id: str):
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")
    return board_state(sessions[session_id])


@router.get("/game/legal")
def get_legal_moves(session_id: str, from_square: Optional[str] = None):
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")
    board = sessions[session_id]["board"]
    moves = list(board.legal_moves)
    if from_square:
        sq    = chess.parse_square(from_square.lower())
        moves = [m for m in moves if m.from_square == sq]
    return {"legal_moves": [m.uci() for m in moves], "from_square": from_square}

@router.post("/game/reset")
def reset_game(req: ResetRequest):
    if req.session_id not in sessions:
        raise HTTPException(404, "Session not found")
    session = sessions[req.session_id]
    new = make_session(
        session["player_color"],
        req.bot_style  or session["bot_style"],
        req.target_elo or session["target_elo"],
    )
    sessions[req.session_id] = new
    return {"status": "reset", "session_id": req.session_id, "board": board_state(new)}

@router.delete("/game/close")
def close_game(session_id: str):
    if session_id in sessions:
        sessions.pop(session_id) 
    return {"status": "closed"}

@router.get("/game/history/flat")
def get_flat_history(session_id: str):
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")
    log = sessions[session_id]["move_log"]
    return {
        "session_id": session_id,
        "moves": [
            {
                "ply":     i + 1,
                "move":    entry["move"],
                "color":   entry["color"],
                "type":    entry["type"],
                "quality": entry.get("quality"),
                "style":   entry.get("style"),
            }
            for i, entry in enumerate(log)
        ]
    }