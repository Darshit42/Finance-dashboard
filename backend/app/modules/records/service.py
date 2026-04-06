import math
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.financial_record import FinancialRecord, RecordType
from app.models.user import User
from app.modules.records.schema import (
    PaginatedRecords, RecordCreate, RecordResponse, RecordUpdate
)


def create_record(db: Session, payload: RecordCreate, current_user: User) -> FinancialRecord:
    record = FinancialRecord(
        user_id=current_user.id,
        amount=payload.amount,
        type=payload.type,
        category=payload.category.strip(),
        date=payload.date or date.today(),
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_records(
    db: Session,
    page: int,
    page_size: int,
    date_from: Optional[date],
    date_to: Optional[date],
    record_type: Optional[RecordType],
    category: Optional[str],
    amount_min: Optional[Decimal],
    amount_max: Optional[Decimal],
    include_deleted: bool = False,
) -> PaginatedRecords:
    query = db.query(FinancialRecord)
    if not include_deleted:
        query = query.filter(FinancialRecord.is_deleted == False)
    if date_from:
        query = query.filter(FinancialRecord.date >= date_from)
    if date_to:
        query = query.filter(FinancialRecord.date <= date_to)
    if record_type:
        query = query.filter(FinancialRecord.type == record_type)
    if category:
        query = query.filter(FinancialRecord.category.ilike(f"%{category}%"))
    if amount_min is not None:
        query = query.filter(FinancialRecord.amount >= amount_min)
    if amount_max is not None:
        query = query.filter(FinancialRecord.amount <= amount_max)

    total = query.count()
    items = (
        query.order_by(FinancialRecord.date.desc(), FinancialRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedRecords(
        items=[RecordResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
    )


def get_record(db: Session, record_id: UUID) -> FinancialRecord:
    record = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.id == record_id, FinancialRecord.is_deleted == False)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


def update_record(db: Session, record_id: UUID, payload: RecordUpdate) -> FinancialRecord:
    record = get_record(db, record_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


def delete_record(db: Session, record_id: UUID) -> None:
    record = get_record(db, record_id)
    record.is_deleted = True
    db.commit()
