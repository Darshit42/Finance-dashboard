"""
Seed script — populates the database with:
  - 3 users (one per role)
  - ~60 financial records spread across 6 months and multiple categories

Usage:
    poetry run python seed.py

Requires a running PostgreSQL and DATABASE_URL in .env
"""
import os
import sys
import random
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.user import User, Role
from app.models.financial_record import FinancialRecord, RecordType

SEED_USERS = [
    {"name": "Alice Admin", "email": "admin@financeboard.dev", "password": "Admin1234!", "role": Role.ADMIN},
    {"name": "Ana Analyst", "email": "analyst@financeboard.dev", "password": "Analyst1234!", "role": Role.ANALYST},
    {"name": "Victor Viewer", "email": "viewer@financeboard.dev", "password": "Viewer1234!", "role": Role.VIEWER},
]

INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Bonus", "Rental Income"]
EXPENSE_CATEGORIES = ["Rent", "Food", "Transport", "Utilities", "Entertainment", "Healthcare", "Software"]

random.seed(42)


def generate_records(user_id, months: int = 6, per_month: int = 10):
    records = []
    today = date.today()
    for m in range(months):
        month_start = date(today.year, today.month, 1) - timedelta(days=m * 30)
        for _ in range(per_month):
            record_type = random.choice([RecordType.INCOME, RecordType.EXPENSE])
            if record_type == RecordType.INCOME:
                category = random.choice(INCOME_CATEGORIES)
                amount = Decimal(str(round(random.uniform(500, 8000), 2)))
            else:
                category = random.choice(EXPENSE_CATEGORIES)
                amount = Decimal(str(round(random.uniform(50, 3000), 2)))

            day_offset = random.randint(0, 27)
            record_date = month_start + timedelta(days=day_offset)

            records.append(FinancialRecord(
                user_id=user_id,
                amount=amount,
                type=record_type,
                category=category,
                date=record_date,
                notes=f"Auto-seeded {record_type.value.lower()} — {category}",
            ))
    return records


def main():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@financeboard.dev").first():
            print("[OK] Database already seeded -- skipping.")
            return

        print("Seeding users...")
        created_users = []
        for u in SEED_USERS:
            user = User(
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(user)
            created_users.append(user)
        db.flush()

        print("Seeding financial records...")
        for user in created_users:
            records = generate_records(user.id, months=6, per_month=10)
            db.add_all(records)

        db.commit()
        print(f"\n[OK] Seeded {len(created_users)} users and ~{len(created_users) * 60} records.\n")
        print("--- Login credentials ---")
        for u in SEED_USERS:
            print(f"  {u['role'].value:<10}  {u['email']}  /  {u['password']}")
        print("-------------------------")

    except Exception as e:
        db.rollback()
        print(f"[FAIL] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
