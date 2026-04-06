from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _create_engine():
    url = settings.DATABASE_URL
    if settings.is_sqlite:
        eng = create_engine(
            url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            poolclass=StaticPool,
        )
        # Register models and create tables (no Alembic for local SQLite file)
        from app.models.user import User 
        from app.models.financial_record import FinancialRecord

        Base.metadata.create_all(bind=eng)
        return eng
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


engine = _create_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
