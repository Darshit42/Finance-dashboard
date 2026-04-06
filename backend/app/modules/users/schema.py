from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from app.models.user import Role


class UserListItem(BaseModel):
    id: UUID
    name: str
    email: str
    role: Role
    is_active: bool
    is_deleted: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedUsers(BaseModel):
    items: list[UserListItem]
    total: int
    page: int
    page_size: int
    pages: int


class UpdateRoleRequest(BaseModel):
    role: Role


class UpdateStatusRequest(BaseModel):
    is_active: bool
