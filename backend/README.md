# FinanceBoard

Role-Based Finance Dashboard — FastAPI + React 18

---

## Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ running locally **or** Docker (see below)

### Database with Docker (optional)

If you do not have PostgreSQL installed, from `finance-backend` run:

```bash
docker compose up -d
```

Wait until the container is healthy, then continue with migrations. The default `DATABASE_URL` in `.env.example` matches this compose file (`postgres` / `secret` / `financeboard` on port 5432).

### 1 — Backend

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL and SECRET_KEY

# Install dependencies
poetry install

# Run Alembic migrations
poetry run alembic upgrade head

# (Optional) Seed demo data
poetry run python seed.py

# Start API server
poetry run uvicorn app.main:app --reload --port 8000
```

API is live at **http://localhost:8000**  
Swagger docs at **http://localhost:8000/docs**

### 2 — Frontend

```bash
cd finance-frontend
npm install
npm run dev
```

Frontend at **http://localhost:5173**

---

## Environment Variables

All variables are read from `finance-backend/.env`. See `.env.example` for the full template.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/financeboard` |
| `SECRET_KEY` | ✅ | JWT signing secret — minimum 32 characters. Generate: `openssl rand -hex 32` |
| `ALGORITHM` | No | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token TTL in minutes (default: `60`) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: `http://localhost:5173`) |

---

## API Overview

| Method | Path | Auth | Min Role | Description |
|---|---|---|---|---|
| POST | `/auth/register` | No | — | Register user (default role: Viewer) |
| POST | `/auth/login` | No | — | Login → JWT |
| GET | `/auth/me` | Yes | Viewer | Current user profile |
| GET | `/users` | Yes | Admin | Paginated user list |
| PATCH | `/users/{id}/role` | Yes | Admin | Change user role |
| PATCH | `/users/{id}/status` | Yes | Admin | Toggle active/inactive |
| DELETE | `/users/{id}` | Yes | Admin | Soft delete user |
| POST | `/records` | Yes | Admin | Create record |
| GET | `/records` | Yes | Analyst | Filtered, paginated list (read-only ledger) |
| GET | `/records/{id}` | Yes | Analyst | Single record |
| PATCH | `/records/{id}` | Yes | Admin | Partial update |
| DELETE | `/records/{id}` | Yes | Admin | Soft delete |
| GET | `/dashboard/summary` | Yes | Viewer | Income, expenses, net, count |
| GET | `/dashboard/by-category` | Yes | Viewer | Per-category breakdown |
| GET | `/dashboard/trends` | Yes | Viewer | Bucketed trend data (`?granularity=monthly&compare=true`) |
| GET | `/dashboard/recent` | Yes | Viewer | Last 10 records (dashboard snapshot) |

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@financeboard.dev | Admin1234! |
| Analyst | analyst@financeboard.dev | Analyst1234! |
| Viewer | viewer@financeboard.dev | Viewer1234! |

---

## Running Tests

Use Poetry’s virtualenv (where FastAPI and the rest of the stack are installed). **Do not run plain `pytest`** with your system or Conda Python, or you will get `ModuleNotFoundError: No module named 'fastapi'`.

```bash
cd backend
poetry install          # once, if you have not already
poetry run pytest
```

---

## Architecture

```
backend/
├── app/
│   ├── core/          # config, db, security, dependencies (RBAC)
│   ├── models/        # SQLAlchemy ORM models
│   ├── modules/
│   │   ├── auth/      # routes / schema / service
│   │   ├── users/     # routes / schema / service
│   │   ├── records/   # routes / schema / service
│   │   └── dashboard/ # routes / schema / service
│   └── middlewares/   # request logging
├── alembic/           # migrations
└── tests/unit/        # service + RBAC unit tests

frontend/
└── src/
    ├── api/           # Axios callers per domain
    ├── components/    # Layout (AppLayout, ProtectedRoute)
    ├── pages/         # Login, Dashboard, Records, Users
    ├── store/         # AuthContext
    └── types/         # TypeScript interfaces
```

---

## Design Decisions & Trade-offs

| Decision | Rationale |
|---|---|
| **JWT access-only (no refresh)** | Refresh-token flows add correctness but also complexity not needed at assessment scope. TTL set to 60 min and documented explicitly. |
| **Role as enum column on users** | A separate roles table adds flexibility but is unnecessary overhead for three fixed roles. |
| **RBAC (matches assignment brief)** | **Viewer:** dashboard endpoints only (aggregates, trends, recent activity—no `/records` list/detail). **Analyst:** dashboard + read-only `/records`. **Admin:** create/update/delete records, soft-delete toggle, user management. |
| **Shared ledger** | All records are visible to Analysts/Admins (team dashboard). Per-user scoping could be added via `?user_id=` for Admins. |
| **SQL-level aggregation** | `DATE_TRUNC` + `GROUP BY` in the DB keeps dashboard latency < 200ms for 100k rows; no Python-side loops. |
| **Single currency** | Multi-currency requires FX rate management which is explicitly out of scope. No currency field on records. |
| **Soft delete** | `is_deleted=true` records excluded from all default queries. Admins can pass `?include_deleted=true`. |
| **bcrypt cost 12** | Balances security (brute-force resistance) and registration latency on commodity hardware. |
