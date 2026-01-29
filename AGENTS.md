# VeriFace Developer Guide for Coding Agents

This document provides coding standards and development commands for VeriFace, an AI-assisted check-in system.

## Project Overview

**Tech Stack:**
- Backend: Python 3.12 + FastAPI + SQLAlchemy + PostgreSQL
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- AI/ML: TensorFlow, Keras FaceNet, MTCNN, OpenCV
- Deployment: Docker Compose

**Architecture:** Backend uses layered architecture (Routers → Services → Repositories → Models). Frontend uses Next.js App Router with centralized API client.

## Build, Lint & Test Commands

### Backend (Python/FastAPI)

**Setup:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Run Development Server:**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 80
```

**Run Single Test:**
```bash
cd backend
python -m pytest test/test_auth.py -v
python -m pytest test/test_auth.py::TestSignup::test_signup_success -v
```

**Run All Tests:**
```bash
cd backend
python -m pytest test/ -v
```

**Run Tests by Category:**
```bash
cd backend
python -m pytest test/ -m auth -v          # Authentication tests only
python -m pytest test/ -m event -v         # Event tests only
python -m pytest test/ -m session -v       # Session tests only
python -m pytest test/ -m integration -v   # Integration tests only
```

**Run Tests with Coverage:**
```bash
cd backend
pytest test/ --cov=app --cov-report=html --cov-report=term
# Coverage report will be in htmlcov/index.html
```

**Run Specific Test File:**
```bash
cd backend
pytest test/test_auth.py -v              # Auth router tests
pytest test/test_protected.py -v         # Protected router tests
pytest test/test_event.py -v             # Event router tests
pytest test/test_session.py -v           # Session router tests
pytest test/test_model.py -v             # Model router tests
```

**Skip Slow Tests:**
```bash
cd backend
pytest test/ -m "not slow" -v
```

### Frontend (Next.js/TypeScript)

**Setup:**
```bash
cd frontend
npm install
```

**Run Development Server:**
```bash
cd frontend
npm run dev          # Starts on port 3000
```

**Build for Production:**
```bash
cd frontend
npm run build
npm run start
```

**Lint:**
```bash
cd frontend
npm run lint
```

**Type Check:**
```bash
cd frontend
npx tsc --noEmit
```

### Docker Compose

**Run Full Stack:**
```bash
docker compose up --build
docker compose up          # Without rebuild
docker compose down        # Stop services
```

**Run Specific Service:**
```bash
docker compose up web      # Frontend only
docker compose up server   # Backend only
```

## Code Style Guidelines

### Backend (Python)

**Imports:**
- Standard library first, then third-party, then local imports
- Group imports logically with blank lines between groups
- Use absolute imports from app root: `from app.db.schema.user import UserOutput`

**Example:**
```python
from typing import List, Dict, Any
from datetime import datetime

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.schema.user import UserOutput
from app.service.userService import UserService
```

**Naming Conventions:**
- Classes: `PascalCase` (e.g., `UserService`, `EventRepository`)
- Functions/methods: `snake_case` (e.g., `get_user_by_id`, `create_event`)
- Private methods/attributes: prefix with `__` (e.g., `self.__userRepository`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `BASE_URL`, `LOGIN_URL`)
- Pydantic schemas: `PascalCase` with suffixes (e.g., `UserInCreate`, `UserOutput`, `UserWithToken`)

**Type Hints:**
- Always use type hints for function parameters and return values
- Use `Union[Type, None]` or `Type | None` for optional values
- Use `List[Type]`, `Dict[str, Any]` for collections

**Error Handling:**
- Raise `HTTPException` with appropriate status codes and detail messages
- Use try-except blocks for database operations
- Log errors with `print()` statements (TODO: implement proper logging)

**Example Service Pattern:**
```python
class UserService:
    def __init__(self, session: Session):
        self.__userRepository = UserRepository(session=session)

    def get_user_by_id(self, user_id: int) -> UserOutput:
        user = self.__userRepository.get_user_by_id(id=user_id)
        if user:
            return user
        raise HTTPException(status_code=400, detail="User Id does not exist.")
```

**Router Pattern:**
```python
@authRouter.post("/signup", status_code=201, response_model=UserOutput)
async def signup(
        signUpDetails: UserInCreate,
        session: Session = Depends(get_db)
):
    try:
        return UserService(session=session).signup(user_details=signUpDetails)
    except Exception as error:
        print(error)
        raise error
```

### Frontend (TypeScript/React)

**Imports:**
- React imports first
- Third-party libraries
- Local components and utilities
- Use path alias `@/` for imports from root

**Example:**
```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { apiClient } from "@/lib/api"
```

**Naming Conventions:**
- Components: `PascalCase` (e.g., `Dashboard`, `CreateEventModal`)
- Files: Match component name (e.g., `Dashboard.tsx`, `CreateEventModal.tsx`)
- Hooks/utilities: `camelCase` (e.g., `useAuth`, `apiClient`)
- Constants: `UPPER_SNAKE_CASE` or `camelCase` for objects
- Types/Interfaces: `PascalCase` (e.g., `User`, `ApiResponse`)

**TypeScript:**
- Always define interfaces for data structures
- Use strict mode (already enabled in tsconfig)
- Prefer `interface` over `type` for object shapes
- Use type inference where obvious, explicit types for public APIs

**React Patterns:**
- Use functional components with hooks
- Prefer `"use client"` directive for interactive components
- Use destructuring for props
- Define component props with interfaces

**Example Component:**
```typescript
"use client"

import { useState } from "react"

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Component logic...
}
```

**Styling:**
- Use Tailwind CSS utility classes
- Use `cn()` helper from `@/lib/utils` to merge class names
- Follow existing color scheme: purple primary (#8B5CF6), with semantic colors

**API Client Pattern:**
```typescript
const response = await apiClient.getCurrentUser()
if (response.error) {
  console.error('Failed:', response.error)
  return
}
const userData = response.data
```

## Architecture Patterns

**Backend Layered Architecture:**
1. **Routers** (`/routers`) - Handle HTTP requests, validate input, call services
2. **Services** (`/service`) - Business logic, orchestrate repositories
3. **Repositories** (`/db/repository`) - Database operations, CRUD
4. **Models** (`/db/models`) - SQLAlchemy ORM models
5. **Schemas** (`/db/schema`) - Pydantic models for validation and serialization

**Frontend Patterns:**
- Pages in `/app` directory (Next.js App Router)
- Reusable UI components in `/components`
- API calls through centralized `apiClient` in `/lib/api.ts`
- Utility functions in `/lib/utils.ts`

## Important Notes

- **Environment Variables:** Backend uses `.env` file (gitignored) for database credentials and secrets
- **Authentication:** JWT tokens stored in localStorage, passed as Bearer tokens
- **CORS:** Backend allows all origins (configured in `main.py`)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Face Recognition:** Uses FaceNet embeddings (512-dim vectors) with cosine similarity matching
- **Docker Ports:** Backend on 80, Frontend on 3000

## Testing Guidelines

- Backend tests use `requests` library for API integration tests
- Test files in `backend/test/` directory
- Tests authenticate first, then test protected endpoints
- Frontend currently has no formal test suite (TODO)

## Common Pitfalls

1. Don't forget to activate virtual environment before running backend
2. Ensure Docker services are running when testing full stack
3. Frontend API calls need proper error handling for network issues
4. Always hash passwords before storing (use `HashHelper.get_password_hash()`)
5. Embeddings must be converted to list of floats before storing in DB
