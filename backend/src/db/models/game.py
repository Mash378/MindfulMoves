import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Boolean

from src.db.models.base import Base

STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


class GameStatus(str, enum.Enum):
    active = "active"
    white_wins = "white_wins"
    black_wins = "black_wins"
    draw = "draw"


class Difficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    magnus = "magnus"


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    difficulty = Column(Enum(Difficulty), nullable=False, default=Difficulty.medium)
    status = Column(Enum(GameStatus), nullable=False, default=GameStatus.active)
    current_fen = Column(String, nullable=False, default=STARTING_FEN)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    
    @property
    def is_win(self, user_id):
        """Check if the given user won this game"""
        if self.status == GameStatus.white_wins:
            # Assuming user is playing as white (adjust based on your game logic)
            return True
        elif self.status == GameStatus.black_wins:
            return False
        return False