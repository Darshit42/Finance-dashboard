from typing import Literal, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.dependencies import require_role
from app.models.user import Role
from app.modules.dashboard import service
from app.modules.dashboard.schema import (
    CategoryBreakdown, RecentRecord, SummaryResponse, TrendResponse
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

_viewer_roles = (Role.VIEWER, Role.ANALYST, Role.ADMIN)


@router.get("/summary", response_model=SummaryResponse)
def summary(
    db: Session = Depends(get_db),
    _=Depends(require_role(*_viewer_roles)),
):
    return service.get_summary(db)


@router.get("/by-category", response_model=list[CategoryBreakdown])
def by_category(
    db: Session = Depends(get_db),
    _=Depends(require_role(*_viewer_roles)),
):
    return service.get_by_category(db)


@router.get("/trends", response_model=TrendResponse)
def trends(
    granularity: Literal["daily", "weekly", "monthly", "quarterly"] = Query("monthly"),
    compare: bool = Query(False),
    db: Session = Depends(get_db),
    _=Depends(require_role(*_viewer_roles)),
):
    return service.get_trends(db, granularity, compare)


@router.get("/recent", response_model=list[RecentRecord])
def recent(
    db: Session = Depends(get_db),
    _=Depends(require_role(*_viewer_roles)),
):
    return service.get_recent(db)
