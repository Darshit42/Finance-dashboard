"""Unit tests for the RBAC require_role dependency."""
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.core.dependencies import require_role, get_current_user
from app.models.user import User, Role


def make_user(role: Role, is_active: bool = True) -> User:
    u = User()
    u.id = "test-uuid"
    u.role = role
    u.is_active = is_active
    u.is_deleted = False
    return u


class TestRequireRole:
    def test_allows_matching_role(self):
        user = make_user(Role.ADMIN)
        checker = require_role(Role.ADMIN)
        result = checker(current_user=user)
        assert result is user

    def test_allows_one_of_multiple_roles(self):
        user = make_user(Role.ANALYST)
        checker = require_role(Role.ANALYST, Role.ADMIN)
        result = checker(current_user=user)
        assert result is user

    def test_rejects_insufficient_role(self):
        user = make_user(Role.VIEWER)
        checker = require_role(Role.ANALYST, Role.ADMIN)
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=user)
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Insufficient permissions"

    def test_viewer_rejected_from_admin_route(self):
        user = make_user(Role.VIEWER)
        checker = require_role(Role.ADMIN)
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=user)
        assert exc_info.value.status_code == 403

    def test_analyst_rejected_from_admin_route(self):
        user = make_user(Role.ANALYST)
        checker = require_role(Role.ADMIN)
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=user)
        assert exc_info.value.status_code == 403

    def test_admin_allows_all_viewer_routes(self):
        user = make_user(Role.ADMIN)
        checker = require_role(Role.VIEWER, Role.ANALYST, Role.ADMIN)
        result = checker(current_user=user)
        assert result is user
