import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.data.env import server_env
from src.db.models.user import User

TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def create_access_token(user_id: str) -> str:
    payload: dict[str, str | datetime] = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(  # pyright: ignore
        payload, server_env.JWT_SECRET_KEY, algorithm="HS256"
    )


def signup_user(body: AuthRequest, db: Session) -> AuthResponse:
    if not body.username.strip() or not body.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required",
        )

    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    user = User(
        id=str(uuid.uuid4()),
        username=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(access_token=create_access_token(str(user.id)))


def login_user(body: AuthRequest, db: Session) -> AuthResponse:
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, str(user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return AuthResponse(access_token=create_access_token(str(user.id)))
