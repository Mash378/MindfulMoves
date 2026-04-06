from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.data.env import server_env
from src.db.models import Base

engine = create_engine(
    server_env.DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
