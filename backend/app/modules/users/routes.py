from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.modules.users import service
from app.modules.users.schema import (
    PaginatedUsers, UserListItem, UpdateRoleRequest, UpdateStatusRequest
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedUsers, dependencies=[Depends(require_role(Role.ADMIN))])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return service.list_users(db, page, page_size)


@router.patch("/{user_id}/role", response_model=UserListItem)
def update_role(
    user_id: UUID,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    user = service.update_role(db, user_id, payload.role, current_user)
    return UserListItem.model_validate(user)


@router.patch("/{user_id}/status", response_model=UserListItem)
def update_status(
    user_id: UUID,
    payload: UpdateStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    user = service.update_status(db, user_id, payload.is_active, current_user)
    return UserListItem.model_validate(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    service.delete_user(db, user_id, current_user)
