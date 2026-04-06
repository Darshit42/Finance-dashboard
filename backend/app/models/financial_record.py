import uuid
import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum as SAEnum,
    ForeignKey, Index, Numeric, String, Text, Uuid, func
)
from sqlalchemy.orm import relationship

from app.core.db import Base


class RecordType(str, enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(SAEnum(RecordType), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today, index=True)
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", backref="records", lazy="select")

    # Composite index for trend queries
    __table_args__ = (
        Index("ix_financial_records_type_date", "type", "date"),
        Index("ix_financial_records_category_lower", "category"),
    )
