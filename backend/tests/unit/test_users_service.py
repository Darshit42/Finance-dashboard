"""Unit tests for user service self-operation guards."""
import pytest
from uuid import uuid4
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.models.user import User, Role
from app.modules.users import service


def make_user(role=Role.ADMIN) -> User:
    u = User()
    u.id = uuid4()
    u.role = role
    u.is_active = True
    u.is_deleted = False
    return u


class TestSelfOperationGuards:
    def test_cannot_change_own_role(self):
        db = MagicMock()
        user = make_user()
        with pytest.raises(HTTPException) as exc_info:
            service.update_role(db, user.id, Role.VIEWER, user)
        assert exc_info.value.status_code == 400
        assert "own role" in exc_info.value.detail

    def test_cannot_change_own_status(self):
        db = MagicMock()
        user = make_user()
        with pytest.raises(HTTPException) as exc_info:
            service.update_status(db, user.id, False, user)
        assert exc_info.value.status_code == 400

    def test_cannot_delete_self(self):
        db = MagicMock()
        user = make_user()
        with pytest.raises(HTTPException) as exc_info:
            service.delete_user(db, user.id, user)
        assert exc_info.value.status_code == 400
        assert "own account" in exc_info.value.detail

    def test_can_change_other_user_role(self):
        db = MagicMock()
        admin = make_user(Role.ADMIN)
        target = make_user(Role.VIEWER)
        db.query.return_value.filter.return_value.first.return_value = target
        result = service.update_role(db, target.id, Role.ANALYST, admin)
        assert result.role == Role.ANALYST
