# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working with this repository.

## Project Overview

VeriFace is an AI-assisted check-in system using facial recognition for classrooms and social events. It uses FaceNet embeddings (512-dimensional vectors) with cosine similarity matching for face verification.

**Tech Stack:**
- Backend: Python 3.12 + FastAPI + SQLAlchemy + PostgreSQL (Supabase)
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- AI/ML: PyTorch, FaceNet-PyTorch, MTCNN, OpenCV
- Deployment: Docker Compose with NVIDIA CUDA 12.8 GPU support

## Build and Run Commands

### Backend
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 80
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Development (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

### Docker (Full Stack)
```bash
docker compose up --build    # Build and start all
docker compose up server     # Backend only
docker compose up web        # Frontend only
```

## Testing

Backend uses pytest with PostgreSQL and transaction rollback for isolation. Tests create data, then rollback - no cleanup needed.

```bash
cd backend
pytest test/ -v                                    # All tests
pytest test/test_auth.py -v                        # Single file
pytest test/test_auth.py::TestSignup::test_signup_success -v  # Single test
pytest test/ -m auth -v                            # By category (auth, event, session)
pytest test/ --cov=app --cov-report=html           # With coverage
```

**Test markers:** `unit`, `integration`, `auth`, `event`, `session`, `slow`, `skip_ci`

**Test fixtures** (from conftest.py): `client`, `test_db`, `test_user`, `test_user_with_embedding`, `auth_headers`, `test_event`, `test_session`

## Architecture

### Backend: Layered Service-Repository Pattern (`backend/app/`)
```
routers/              → HTTP handlers, request parsing, call services
  auth.py             → Public auth (login/signup)
  protected/          → JWT-protected routes (events, sessions, check-in, settings)
service/              → Business logic, orchestrates repositories
db/repository/        → Database CRUD (extends BaseRepository from base.py)
db/models/            → SQLAlchemy ORM models
db/schema/            → Pydantic request/response schemas
core/security/        → JWT (authHandler.py) and bcrypt (hashHelper.py)
util/                 → Route protection, face embeddings, CSV processing, permissions
```

Service injection pattern — services are instantiated with a SQLAlchemy `Session` and create their own repos:
```python
class UserService:
    def __init__(self, session: Session):
        self.__userRepository = UserRepository(session=session)
```

Database uses NullPool (no connection pooling) configured in `core/database.py`.

### Frontend: Next.js App Router (`frontend/`)
- Pages in `app/` directory — all use `"use client"` directive
- Centralized API client at `lib/api.ts` — all backend calls go through `apiClient`
- Custom hooks in `lib/hooks/` — `useEvents` fetches owned events from `/protected/event/getOwnedEvents`
- Reusable UI components in `components/ui/`
- Theme context (`contexts/themeContext.tsx`) for light/dark mode with localStorage persistence
- Path alias `@/` maps to project root

**Pages:**
- `/dashboard` — attendance overview with weekly trends chart, per-session table, export CSV
- `/events` — manage events and members, CSV bulk import
- `/participation` — Cold Call Wheel: selects event via `?eventId=`, fetches latest session's present/late attendees, spins wheel to randomly call a member
- `/picture` — upload face photo to generate/update embedding
- `/settings` — theme preferences

### Database Schema
Key relationships: `Users` ↔ `Events` (many-to-many via `EventsUsers`), `Events` → `Sessions` (one-to-many), `Sessions` ↔ `Users` → `Attendance` (status enum: present/late/absent). Events cascade-delete sessions and attendance.

### Face Recognition Flow
1. Upload image → MTCNN detects exactly 1 face → FaceNet generates 512-dim embedding
2. Embedding stored as `ARRAY(Float)` in PostgreSQL `Users` table
3. Check-in: extract embedding from new photo, cosine similarity against all session attendees
4. Similarity threshold: < 0.5 = match (same person), > 0.5 = different person

## Key API Endpoints

**Auth (public):** `POST /auth/signup`, `POST /auth/login`

**Protected (require `Authorization: Bearer <token>`):**
- `POST /protected/uploadPicture` — Upload face image, generate/update embedding
- `GET /protected/testToken` — Validate token and return current user info
- `POST /protected/event/createEvent`, `POST /protected/event/removeEvent`
- `POST /protected/event/getOwnedEvents` — List events owned by current user
- `POST /protected/event/{eventId}/addMember`, `POST /protected/event/{eventId}/removeMember`
- `POST /protected/event/getUsers` — Get members of an event
- `POST /protected/event/{eventId}/uploadUserCSV` — Bulk import users from CSV
- `POST /protected/event/{eventId}/sendInviteEmails` — Email invitations to event members
- `POST /protected/session/createSession` — Creates session and auto-populates attendance
- `POST /protected/session/getSessions` — Get all sessions for an event
- `POST /protected/session/getAttendance` — Get attendance records for a session
- `POST /protected/session/getEventAttendanceOverview` — Aggregated attendance stats across all sessions
- `POST /protected/session/updateAttendanceStatus` — Manually override a user's attendance status
- `POST /protected/session/checkin` — Facial recognition check-in
- `GET/PATCH /protected/settings/` — User theme preferences
- `POST /protected/model/hasEmbedding` — Check if user has face data

## Code Conventions

### Backend (Python)
- Services/repos use `__` prefix for private attributes
- Type hints required on all functions
- Raise `HTTPException` with appropriate status codes
- Imports: standard library, then third-party, then local (`from app.db.schema...`)
- Classes: `PascalCase`, functions: `snake_case`, constants: `UPPER_SNAKE_CASE`

### Frontend (TypeScript/React)
- Use `cn()` from `@/lib/utils` for Tailwind class merging
- Purple primary color (#8B5CF6)
- API calls through `apiClient` with error handling pattern:
```typescript
const response = await apiClient.getCurrentUser()
if (response.error) { /* handle error */ }
```
- Components: `PascalCase`, hooks/utilities: `camelCase`

## Environment

Backend `.env` (gitignored) requires:
```
user=...
password=...
host=...
port=5432
dbname=postgres
SECRET_KEY=...
```

Frontend `.env.local` (gitignored):
```
NEXT_PUBLIC_API_URL=http://localhost:80   # or ngrok URL for remote testing
```

JWT tokens expire in 2.5 hours. Stored in localStorage, sent as Bearer token.

The project uses **ngrok** for public tunneling during development/demo (URLs printed in `main.py` on startup). Update those print statements when ngrok URLs change.
