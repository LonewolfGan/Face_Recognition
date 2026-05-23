# Face Recognition Notes

A full-stack application with facial recognition authentication and note management, built with React (frontend) and Python/Flask (backend).

## Features

- Face recognition authentication via webcam
- Password-based authentication (alternative)
- Rich text note editor with folder organization
- Light/dark theme support
- Responsive interface

## Project Structure

```
Face_Recognition/
├── frontend/                # React + Vite application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utilities and API client
│   │   ├── styles/          # CSS styles
│   │   └── theme/           # Theme configuration
│   ├── public/              # Static assets
│   ├── vercel.json          # Vercel deployment config
│   └── package.json
├── backend/
│   ├── app/                 # Flask application package
│   │   ├── __init__.py      # Application factory (create_app)
│   │   ├── config.py        # Configuration classes
│   │   ├── auth.py          # JWT/bcrypt utilities
│   │   ├── validators.py    # Input validation
│   │   ├── rate_limiter.py  # Rate limiting middleware
│   │   ├── cors.py          # CORS configuration
│   │   ├── routes/          # Blueprint route handlers
│   │   ├── services/        # Business logic (face, embeddings)
│   │   └── models/          # Database models
│   ├── tests/               # Test suite
│   ├── data/                # Runtime data (DB, embeddings)
│   ├── run.py               # Application entry point
│   └── requirements.txt     # Python dependencies
├── dev.bat                  # Windows dev startup script
├── dev.sh                   # Linux/macOS dev startup script
├── docker-compose.yml       # Containerized development
├── render.yaml              # Render deployment config
├── .env.example             # Environment variable template
└── README.md
```

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Python 3.9+** — [Download](https://www.python.org/downloads/)
- **Webcam** (for face recognition features)
- **Build tools** (for native Python dependencies):
  ```bash
  # Windows
  winget install -e --id Kitware.CMake

  # Linux (Debian/Ubuntu)
  sudo apt-get install build-essential cmake
  ```

## Setup

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env with your secret keys
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

## Development

### Single-command startup

Start both backend and frontend with one command:

```bash
# Windows
dev.bat

# Linux/macOS
./dev.sh
```

This launches:
- Flask backend on **http://localhost:5000**
- Vite dev server on **http://localhost:5173**

### Manual startup

If you prefer to run services separately:

```bash
# Terminal 1 — Backend
cd backend
.venv\Scripts\activate   # or: source .venv/bin/activate
python run.py

# Terminal 2 — Frontend
cd frontend
npm run dev
```

### Running tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Deployment

### Frontend (Vercel)

The frontend deploys as a static site on Vercel:

1. Connect the repository to Vercel
2. Set the root directory to `frontend/`
3. Set the `VITE_API_URL` environment variable to your backend URL
4. Vercel auto-detects Vite and builds accordingly

API requests are proxied to the backend via rewrites configured in `frontend/vercel.json`.

### Backend (Render)

The backend deploys on Render as a Python web service:

1. Connect the repository to Render
2. Render reads `render.yaml` for service configuration
3. Set environment variables: `JWT_SECRET_KEY`, `SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_PATH`
4. The service starts with Gunicorn on the configured port

Health check endpoint: `GET /health`

### Docker (local)

```bash
docker-compose up --build
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `dev.bat` / `dev.sh` | Start full dev environment |
| `python backend/run.py` | Start backend only |
| `cd frontend && npm run dev` | Start frontend only |
| `cd frontend && npm run build` | Build frontend for production |
| `cd backend && pytest` | Run backend tests |
| `python migrate_data.py` | Migrate data files to new structure |

## Data Migration

If upgrading from the old multi-service structure, run the migration script to move data files:

```bash
python migrate_data.py
```

This moves `users.db`, `embeddings.pkl`, and `embeddings.index` into `backend/data/`.

## Environment Variables

See `.env.example` for all available configuration options. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Flask environment | `development` |
| `SECRET_KEY` | Flask secret key | — |
| `JWT_SECRET_KEY` | JWT signing key | — |
| `DATABASE_PATH` | SQLite database path | `backend/data/users.db` |
| `DATA_DIR` | Data directory | `backend/data/` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `VITE_API_URL` | Backend URL for frontend | `http://localhost:5000` |
| `MODEL_NAME` | DeepFace model | `ArcFace` |
| `DETECTOR_BACKEND` | Face detector | `ssd` |

## License

MIT
