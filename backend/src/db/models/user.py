from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from src.db.models.base import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    games_played = Column(Integer, default=0)
    games_won = Column(Integer, default=0)
    win_rate = Column(Integer, default=0)
    elo_rating = Column(Integer, default=400)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
