# TangleFix

A multi-user scheduling SaaS MVP built with React, FastAPI and PostgreSQL.
The scheduling engine uses deterministic algorithms only: interval conflict detection,
constraint-aware backtracking, priority scoring and alternative schedule generation.
No AI, ML, LLM or predictive model is used.

## Requirements
- Docker Desktop (recommended), or Python 3.11+ and Node.js 20+
- PostgreSQL 15+ if running without Docker

## Run with Docker
1. Extract this folder.
2. In the project root run:
   ```bash
   docker compose up --build
   ```
3. Open http://localhost:5173
4. API docs: http://localhost:8000/docs

The API creates tables automatically on startup. Register a user, sign in, and create events.

## Run locally without Docker
Backend:
```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Set DATABASE_URL to your PostgreSQL connection string
uvicorn app.main:app --reload
```
Frontend:
```powershell
cd frontend
npm install
npm run dev
```
Set `VITE_API_URL=http://localhost:8000` in `frontend/.env` if needed.

## MVP features
- User registration and JWT login
- User-isolated events
- Event create, list, update and delete
- Fixed and flexible events, priorities, duration and availability windows
- Conflict detection using half-open intervals [start, end)
- Automatic schedule generation with alternatives
- Explanation of conflicts and schedule score

## Scheduling model
All timestamps are ISO 8601. The MVP schedules within one selected date.
A flexible event can be moved only inside its allowed window. Fixed events never move.
Events assigned to the same resource cannot overlap. If no resource is supplied,
the user's personal calendar is treated as one shared resource.

## Important limitations
This is an MVP, not a production-hardened enterprise deployment. Before commercial use:
- Add email verification, password reset, refresh-token rotation and rate limiting.
- Use Alembic migrations instead of `create_all`.
- Add tests, audit logs, backups, monitoring and HTTPS.
- Define resource-sharing permissions and organization/team roles.
- For large instances, replace exhaustive backtracking with a bounded solver and
  add pagination/background jobs.
# TangleFix
