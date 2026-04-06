from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.modules.auth import service
from app.modules.auth.schema import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserProfile,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserProfile, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = service.register_user(db, payload)
    return UserProfile.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    token = service.authenticate_user(db, payload)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserProfile)
def me(current_user: User = Depends(get_current_user)):
    return UserProfile.model_validate(current_user)
