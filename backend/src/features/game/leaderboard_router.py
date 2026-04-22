from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from src.db.models.game import Game, GameStatus, Difficulty
from src.db.models.user import User
from src.db.database import get_db

router = APIRouter()

@router.get("/api/leaderboard/{difficulty}")
async def get_leaderboard(difficulty: str, db: Session = Depends(get_db)):
    """
    Get leaderboard for a specific difficulty
    Returns top 10 users sorted by wins for that difficulty
    """
    
    # Validate difficulty
    try:
        diff_enum = Difficulty(difficulty)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty: {difficulty}")
    
    # Query to get wins and total games per user for specific difficulty
    results = db.query(
        User.id,
        User.username,
        func.count(Game.id).label('total_games'),
        func.sum(
            case(
                (Game.status == GameStatus.white_wins, 1),  
                else_=0
            )
        ).label('wins')
    ).join(
        Game, User.id == Game.user_id
    ).filter(
        Game.difficulty == diff_enum,
        Game.status != GameStatus.active  # Only count completed games
    ).group_by(
        User.id, User.username
    ).having(
        func.count(Game.id) > 0
    ).order_by(
        func.sum(
            case(
                (Game.status == GameStatus.white_wins, 1),
                else_=0
            )
        ).desc(),
        func.count(Game.id).desc()
    ).limit(10).all()
    
    # Transform to expected format
    leaderboard = []
    for user_id, username, total_games, wins in results:
        leaderboard.append({
            "id": user_id,
            "username": username,
            "games_won": wins or 0,
            "games_played": total_games or 0
        })
    
    return leaderboard