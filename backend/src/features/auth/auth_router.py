from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.features.auth.auth_controller import (
    AuthRequest,
    AuthResponse,
    login_user,
    signup_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(body: AuthRequest, db: Session = Depends(get_db)):
    return signup_user(body, db)


@router.post("/login", response_model=AuthResponse)
def login(body: AuthRequest, db: Session = Depends(get_db)):
    return login_user(body, db)
