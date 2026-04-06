from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Literal, Optional

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.financial_record import FinancialRecord, RecordType
from app.modules.dashboard.schema import (
    CategoryBreakdown,
    RecentRecord,
    SummaryResponse,
    TrendPoint,
    TrendResponse,
)

Granularity = Literal["daily", "weekly", "monthly", "quarterly"]

_TRUNC_MAP: dict[str, str] = {
    "daily": "day",
    "weekly": "week",
    "monthly": "month",
    "quarterly": "quarter",
}


def _income_expr():
    return func.coalesce(
        func.sum(case((FinancialRecord.type == RecordType.INCOME, FinancialRecord.amount), else_=0)),
        Decimal("0"),
    )


def _expense_expr():
    return func.coalesce(
        func.sum(case((FinancialRecord.type == RecordType.EXPENSE, FinancialRecord.amount), else_=0)),
        Decimal("0"),
    )


def get_summary(db: Session) -> SummaryResponse:
    row = db.query(
        _income_expr().label("total_income"),
        _expense_expr().label("total_expenses"),
        func.count(FinancialRecord.id).label("record_count"),
    ).filter(FinancialRecord.is_deleted == False).one()

    return SummaryResponse(
        total_income=row.total_income or Decimal("0"),
        total_expenses=row.total_expenses or Decimal("0"),
        net_balance=(row.total_income or Decimal("0")) - (row.total_expenses or Decimal("0")),
        record_count=row.record_count,
    )


def get_by_category(db: Session) -> list[CategoryBreakdown]:
    rows = (
        db.query(
            FinancialRecord.category.label("category"),
            _income_expr().label("total_income"),
            _expense_expr().label("total_expenses"),
        )
        .filter(FinancialRecord.is_deleted == False)
        .group_by(FinancialRecord.category)
        .order_by(func.sum(FinancialRecord.amount).desc())
        .all()
    )
    return [
        CategoryBreakdown(
            category=r.category,
            total_income=r.total_income or Decimal("0"),
            total_expenses=r.total_expenses or Decimal("0"),
            net=(r.total_income or Decimal("0")) - (r.total_expenses or Decimal("0")),
        )
        for r in rows
    ]


def _bucket_start(d: date, trunc: str) -> date:
    if trunc == "day":
        return d
    if trunc == "week":
        return d - timedelta(days=d.weekday())
    if trunc == "month":
        return date(d.year, d.month, 1)
    if trunc == "quarter":
        m = ((d.month - 1) // 3) * 3 + 1
        return date(d.year, m, 1)
    raise ValueError(f"Unsupported trunc: {trunc}")


def _query_trend_points_sqlite(
    db: Session,
    trunc: str,
    date_from: Optional[date],
    date_to: Optional[date],
) -> list[TrendPoint]:
    q = db.query(FinancialRecord).filter(FinancialRecord.is_deleted == False)
    if date_from:
        q = q.filter(FinancialRecord.date >= date_from)
    if date_to:
        q = q.filter(FinancialRecord.date <= date_to)
    agg: dict[date, dict[str, Decimal]] = defaultdict(
        lambda: {"income": Decimal("0"), "expenses": Decimal("0")}
    )
    for r in q.all():
        start = _bucket_start(r.date, trunc)
        if r.type == RecordType.INCOME:
            agg[start]["income"] += r.amount
        else:
            agg[start]["expenses"] += r.amount
    points: list[TrendPoint] = []
    for start in sorted(agg.keys()):
        inc = agg[start]["income"]
        exp = agg[start]["expenses"]
        points.append(
            TrendPoint(
                period=start.strftime("%Y-%m-%d"),
                income=inc,
                expenses=exp,
                net=inc - exp,
            )
        )
    return points


def _query_trend_points(
    db: Session,
    trunc: str,
    date_from: Optional[date],
    date_to: Optional[date],
) -> list[TrendPoint]:
    if db.get_bind().dialect.name == "sqlite":
        return _query_trend_points_sqlite(db, trunc, date_from, date_to)

    period_col = func.date_trunc(trunc, FinancialRecord.date).label("period")
    query = (
        db.query(
            period_col,
            _income_expr().label("income"),
            _expense_expr().label("expenses"),
        )
        .filter(FinancialRecord.is_deleted == False)
    )
    if date_from:
        query = query.filter(FinancialRecord.date >= date_from)
    if date_to:
        query = query.filter(FinancialRecord.date <= date_to)

    rows = query.group_by(period_col).order_by(period_col).all()
    return [
        TrendPoint(
            period=row.period.strftime("%Y-%m-%d") if row.period else "",
            income=row.income or Decimal("0"),
            expenses=row.expenses or Decimal("0"),
            net=(row.income or Decimal("0")) - (row.expenses or Decimal("0")),
        )
        for row in rows
    ]


def get_trends(
    db: Session,
    granularity: Granularity,
    compare: bool,
) -> TrendResponse:
    trunc = _TRUNC_MAP[granularity]
    today = date.today()

    # Determine current period window
    if granularity == "daily":
        current_from = today - timedelta(days=30)
        delta = timedelta(days=30)
    elif granularity == "weekly":
        current_from = today - timedelta(weeks=12)
        delta = timedelta(weeks=12)
    elif granularity == "quarterly":
        current_from = date(today.year - 1, today.month, 1)
        delta = timedelta(days=365)
    else:  # monthly
        current_from = date(today.year - 1, today.month, 1)
        delta = timedelta(days=365)

    current_points = _query_trend_points(db, trunc, current_from, today)

    previous_points = None
    if compare:
        prev_to = current_from - timedelta(days=1)
        prev_from = prev_to - delta
        previous_points = _query_trend_points(db, trunc, prev_from, prev_to)

    return TrendResponse(
        granularity=granularity,
        current_period=current_points,
        previous_period=previous_points,
    )


def get_recent(db: Session) -> list[RecentRecord]:
    records = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.is_deleted == False)
        .order_by(FinancialRecord.date.desc(), FinancialRecord.created_at.desc())
        .limit(10)
        .all()
    )
    return [RecentRecord.model_validate(r) for r in records]
