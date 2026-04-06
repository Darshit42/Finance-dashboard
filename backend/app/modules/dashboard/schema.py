from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class SummaryResponse(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    record_count: int


class CategoryBreakdown(BaseModel):
    category: str
    total_income: Decimal
    total_expenses: Decimal
    net: Decimal


class TrendPoint(BaseModel):
    period: str
    income: Decimal
    expenses: Decimal
    net: Decimal


class TrendResponse(BaseModel):
    granularity: str
    current_period: list[TrendPoint]
    previous_period: Optional[list[TrendPoint]] = None


class RecentRecord(BaseModel):
    id: UUID
    amount: Decimal
    type: str
    category: str
    date: date
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
