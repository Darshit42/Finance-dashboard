"""Unit tests for the records service layer (no DB required)."""
import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException

from app.models.financial_record import FinancialRecord, RecordType
from app.models.user import User, Role
from app.modules.records import service
from app.modules.records.schema import RecordCreate, RecordUpdate


def make_record(is_deleted=False) -> FinancialRecord:
    r = FinancialRecord()
    r.id = uuid4()
    r.user_id = uuid4()
    r.amount = Decimal("500.00")
    r.type = RecordType.INCOME
    r.category = "Salary"
    r.date = date.today()
    r.notes = None
    r.is_deleted = is_deleted
    return r


def make_user() -> User:
    u = User()
    u.id = uuid4()
    u.role = Role.ANALYST
    return u


class TestDeleteRecord:
    def test_soft_delete_sets_flag(self):
        db = MagicMock()
        record = make_record()
        with patch.object(service, "get_record", return_value=record):
            service.delete_record(db, record.id)
        assert record.is_deleted is True
        db.commit.assert_called_once()

    def test_delete_not_found_raises_404(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            service.get_record(db, uuid4())
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Record not found"


class TestUpdateRecord:
    def test_partial_update_only_touches_provided_fields(self):
        db = MagicMock()
        record = make_record()
        original_type = record.type
        payload = RecordUpdate(amount=Decimal("999.00"))

        with patch.object(service, "get_record", return_value=record):
            service.update_record(db, record.id, payload)

        assert record.amount == Decimal("999.00")
        assert record.type == original_type  # unchanged


class TestCreateRecord:
    def test_creates_record_with_user_id(self):
        db = MagicMock()
        db.add = MagicMock()
        db.commit = MagicMock()
        db.refresh = MagicMock()
        user = make_user()
        payload = RecordCreate(
            amount=Decimal("1000.00"),
            type=RecordType.INCOME,
            category="Salary",
        )
        service.create_record(db, payload, user)
        created = db.add.call_args[0][0]
        assert str(created.user_id) == str(user.id)
        assert created.amount == Decimal("1000.00")
