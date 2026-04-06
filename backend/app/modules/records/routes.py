from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.financial_record import RecordType
from app.models.user import User, Role
from app.modules.records import service
from app.modules.records.schema import PaginatedRecords, RecordCreate, RecordResponse, RecordUpdate

router = APIRouter(prefix="/records", tags=["Records"])


@router.post("", response_model=RecordResponse, status_code=201)
def create_record(
    payload: RecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    record = service.create_record(db, payload, current_user)
    return RecordResponse.model_validate(record)


@router.get("", response_model=PaginatedRecords)
def list_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    type: Optional[RecordType] = Query(None),
    category: Optional[str] = Query(None),
    amount_min: Optional[Decimal] = Query(None),
    amount_max: Optional[Decimal] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ANALYST, Role.ADMIN)),
):
    return service.list_records(
        db, page, page_size, date_from, date_to, type, category,
        amount_min, amount_max,
        include_deleted=(include_deleted and current_user.role == Role.ADMIN),
    )


@router.get("/{record_id}", response_model=RecordResponse)
def get_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(Role.ANALYST, Role.ADMIN)),
):
    record = service.get_record(db, record_id)
    return RecordResponse.model_validate(record)


@router.patch("/{record_id}", response_model=RecordResponse)
def update_record(
    record_id: UUID,
    payload: RecordUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    record = service.update_record(db, record_id, payload)
    return RecordResponse.model_validate(record)


@router.delete("/{record_id}", status_code=204)
def delete_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    service.delete_record(db, record_id)
