import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User, Role
from app.modules.users.schema import PaginatedUsers, UserListItem


def list_users(db: Session, page: int, page_size: int) -> PaginatedUsers:
    query = db.query(User).filter(User.is_deleted == False)
    total = query.count()
    items = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedUsers(
        items=[UserListItem.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
    )


def update_role(db: Session, target_id: UUID, new_role: Role, current_user: User) -> User:
    if str(target_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user = _get_active_user(db, target_id)
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user


def update_status(db: Session, target_id: UUID, is_active: bool, current_user: User) -> User:
    if str(target_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot change your own status")
    user = _get_active_user(db, target_id)
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, target_id: UUID, current_user: User) -> None:
    if str(target_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = _get_active_user(db, target_id)
    user.is_deleted = True
    user.is_active = False
    db.commit()


def _get_active_user(db: Session, user_id: UUID) -> User:
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
