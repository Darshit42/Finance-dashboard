from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.financial_record import RecordType


class RecordCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Amount must be a positive number")
    type: RecordType
    category: str = Field(..., min_length=1, max_length=64)
    date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be a positive number")
        return v


class RecordUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    type: Optional[RecordType] = None
    category: Optional[str] = Field(None, min_length=1, max_length=64)
    date: Optional[date] = None
    notes: Optional[str] = None


class RecordResponse(BaseModel):
    id: UUID
    user_id: UUID
    amount: Decimal
    type: RecordType
    category: str
    date: date
    notes: Optional[str]
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedRecords(BaseModel):
    items: list[RecordResponse]
    total: int
    page: int
    page_size: int
    pages: int
