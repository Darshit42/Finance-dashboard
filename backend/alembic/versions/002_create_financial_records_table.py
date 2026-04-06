"""create financial_records table

Revision ID: 002
Revises: 001
Create Date: 2026-04-04
"""
from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "financial_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "type",
            sa.Enum("INCOME", "EXPENSE", name="recordtype"),
            nullable=False,
        ),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_financial_records_user_id", "financial_records", ["user_id"])
    op.create_index("ix_financial_records_type", "financial_records", ["type"])
    op.create_index("ix_financial_records_category", "financial_records", ["category"])
    op.create_index("ix_financial_records_date", "financial_records", ["date"])
    op.create_index("ix_financial_records_is_deleted", "financial_records", ["is_deleted"])
    op.create_index(
        "ix_financial_records_type_date", "financial_records", ["type", "date"]
    )
    op.create_index(
        "ix_financial_records_category_lower", "financial_records", ["category"]
    )


def downgrade() -> None:
    op.drop_index("ix_financial_records_category_lower", table_name="financial_records")
    op.drop_index("ix_financial_records_type_date", table_name="financial_records")
    op.drop_index("ix_financial_records_is_deleted", table_name="financial_records")
    op.drop_index("ix_financial_records_date", table_name="financial_records")
    op.drop_index("ix_financial_records_category", table_name="financial_records")
    op.drop_index("ix_financial_records_type", table_name="financial_records")
    op.drop_index("ix_financial_records_user_id", table_name="financial_records")
    op.drop_table("financial_records")
    op.execute("DROP TYPE IF EXISTS recordtype")
