import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from src.db.models.base import Base


class Move(Base):
    __tablename__ = "moves"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String, ForeignKey("games.id"), nullable=False, index=True)
    move_number = Column(Integer, nullable=False)  # 1-indexed full move count
    player_uci = Column(String, nullable=False)  # e.g. "e2e4"
    ai_uci = Column(String, nullable=True)  # null if game ended on player's move
    fen_after_player = Column(String, nullable=False)
    fen_after_ai = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
