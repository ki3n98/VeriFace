# VeriFace AI Agent Guide

This file provides guidance to AI coding agents (Claude, Cursor, Copilot, etc.) when working with this repository.

## Project Overview

VeriFace is an AI-assisted check-in system using facial recognition for classrooms and social events. It uses FaceNet embeddings (512-dimensional vectors) with cosine similarity matching for face verification.

**Tech Stack:**
- Backend: Python 3.12 + FastAPI + SQLAlchemy + PostgreSQL (Supabase)
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- AI/ML: TensorFlow, Keras FaceNet, MTCNN, OpenCV
- Deployment: Docker Compose with NVIDIA CUDA 12.2 GPU support

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

**Test fixtures** (from conftest.py): `client`, `test_db`, `test_user`, `test_user_with_embedding`, `auth_headers`, `test_event`, `test_session`

## Architecture

### Backend: Layered Architecture
```
Routers (/app/routers)     → HTTP handlers, call services
Services (/app/service)    → Business logic, orchestrate repos
Repositories (/app/db/repository) → Database CRUD
Models (/app/db/models)    → SQLAlchemy ORM
Schemas (/app/db/schema)   → Pydantic validation
```

Service injection pattern:
```python
class UserService:
    def __init__(self, session: Session):
        self.__userRepository = UserRepository(session=session)
```

### Frontend: Next.js App Router
- Pages in `/app` directory
- `"use client"` directive for interactive components
- Centralized API client at `/lib/api.ts`
- UI components in `/components/ui`
- Path alias `@/` for imports

### Face Recognition Flow
1. User uploads image → `POST /protected/uploadPicture`
2. MTCNN detects face, FaceNet generates 512-dim embedding
3. Embedding stored in `Users.embedding` (PostgreSQL ARRAY(Float))
4. Check-in: new face extracted, compared via cosine similarity
5. Similarity < 0.5 = same person, > 0.5 = different person

## Key API Endpoints

**Auth (public):** `POST /auth/signup`, `POST /auth/login`

**Protected (require `Authorization: Bearer <token>`):**
- `POST /protected/uploadPicture` - Upload face for embedding
- `POST /protected/event/createEvent`, `GET /protected/event/getEvents`
- `POST /protected/session/createSession`, `POST /protected/session/checkIn`

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

JWT tokens expire in 2.5 hours. Stored in localStorage, sent as Bearer token.
