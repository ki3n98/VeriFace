# VeriFace

An AI-assisted check-in system using facial recognition for classrooms and social events.

## Features

- **Facial recognition check-in** — FaceNet 512-dim embeddings with cosine similarity matching (threshold < 0.5)
- **QR code check-in** — per-session QR codes for mobile camera-based attendance
- **Real-time updates** — WebSocket-powered live attendance feed during active sessions
- **Event & session management** — role-based access control (owner / admin / member)
- **Attendance tracking** — present / late / absent statuses with weekly trend charts
- **Cold Call Wheel** — randomly selects a present attendee for participation
- **CSV bulk import** — add event members from a spreadsheet
- **Email invitations** — invite members directly from the app
- **Avatar moderation** — NudeNet NSFW content filtering on uploaded profile photos
- **Achievements** — 5 unlockable badges based on attendance behavior
- **Light / dark theme**

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, PostgreSQL (Supabase) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| AI/ML | PyTorch, FaceNet-PyTorch 2.6, MTCNN, OpenCV |
| Auth | JWT, bcrypt |
| Storage | Supabase |
| Deployment | Docker Compose, NVIDIA CUDA 12.8 |
| Dev tunneling | ngrok |

## Getting Started

### Prerequisites

- **Docker route**: Docker + Docker Compose with NVIDIA Container Toolkit (GPU required for face recognition)
- **Manual route**: Python 3.12, Node.js 18+, a running PostgreSQL instance

### Docker (Recommended)

```bash
docker compose up --build
```

Backend available at `http://localhost:80`, frontend at `http://localhost:3000`.

### Manual

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 80
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## Environment Variables

`backend/.env`:
```env
# PostgreSQL (Supabase)
user=...
password=...
host=...
port=5432
dbname=postgres

# JWT
SECRET_KEY=...

# Supabase storage (avatar uploads)
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_BUCKET=...

# Email (optional)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
```

`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:80
```

## Project Structure

```
VeriFace/
├── compose.yaml               # Docker Compose (backend + frontend + GPU)
├── backend/
│   ├── main.py                # FastAPI entry point, router registration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── routers/
│       │   ├── auth.py        # /login, /signup
│       │   └── protected/     # Authenticated endpoints
│       │       ├── event.py, session.py, avatar.py
│       │       ├── achievements.py, profile.py
│       │       ├── model.py   # Face recognition endpoint
│       │       └── userSetting.py, emailChange.py
│       ├── service/           # Business logic layer
│       ├── db/
│       │   ├── models/        # SQLAlchemy ORM models
│       │   ├── repository/    # CRUD (extends BaseRepository)
│       │   └── schema/        # Pydantic request/response schemas
│       ├── core/              # JWT auth, database session
│       └── util/
│           ├── embeddings.py  # MTCNN + FaceNet pipeline
│           ├── ws_manager.py  # WebSocket connection manager
│           ├── csv_processor.py
│           └── permission.py
└── frontend/
    ├── app/                   # Next.js App Router pages
    │   ├── page.tsx           # Landing
    │   ├── dashboard/         # Attendance charts + table
    │   ├── events/            # Event CRUD + CSV import
    │   ├── participation/     # Cold Call Wheel
    │   ├── picture/           # Face photo upload
    │   ├── settings/          # Profile, theme, achievements, security
    │   └── sign-in/, sign-up/
    ├── components/ui/         # Reusable UI components
    ├── lib/
    │   ├── api.ts             # Centralized API client (JWT auto-injection)
    │   └── hooks/
    │       ├── useEvents.ts
    │       └── useWebSocket.ts
    └── contexts/
        └── themeContext.tsx
```

## Face Recognition Flow

1. **Enrollment** — user uploads a photo → MTCNN detects exactly 1 face → FaceNet generates a 512-dim embedding → stored in PostgreSQL
2. **Check-in** — camera capture → same pipeline → cosine similarity against stored embedding → distance < 0.5 = verified

## Database Models

| Model | Key fields |
|---|---|
| User | email, hashed_password, embedding (float[512]) |
| Event | name, description, owner |
| Session | event_id, start_time, end_time, qr_token |
| Attendance | user_id, session_id, status (PRESENT/LATE/ABSENT) |
| EventUser | event_id, user_id, role (owner/admin/member) |
| UserSetting | theme, notification preferences |
| UserAchievement | user_id, badge_id, unlocked_at |

## Testing

```bash
cd backend
pytest test/ -v                # All tests (~90 cases)
pytest test/ -m auth -v        # Auth endpoints only
pytest test/ -m event -v       # Event endpoints only
pytest test/ -m session -v     # Session endpoints only
pytest test/ --cov=app         # With coverage report
```

Tests use a real PostgreSQL database with transaction rollback for isolation. See [TESTING_SETUP.md](TESTING_SETUP.md) for setup instructions.

## Contributors

- Kien Pham
- Hector Soltero
- Jason Tran
- Syn Nguyen
- Kira Yen
