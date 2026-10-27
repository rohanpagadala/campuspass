import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401  ensures models are registered before create_all
from app.routers import auth, hod, outpass, security

Base.metadata.create_all(bind=engine)

# One-time bootstrap for platforms with no shell access (e.g. Render's free
# tier) - set SEED_ON_STARTUP=true for exactly one deploy to create the real
# accounts, then unset it. Each created account's password is printed (only
# here, in the deploy logs - never written anywhere persistent in this
# environment); re-running is harmless since the underlying seed logic is
# idempotent and only prints/creates accounts that don't already exist.
if os.getenv("SEED_ON_STARTUP") == "true":
    from app.database import SessionLocal
    from scripts.seed import seed_real_users

    _seed_db = SessionLocal()
    try:
        seed_real_users(_seed_db, [])
    finally:
        _seed_db.close()

# Same one-time-bootstrap pattern as above, for resetting the real accounts'
# passwords to literally equal their own usernames (dev/demo convenience -
# see scripts/seed.py's reset_real_user_passwords_to_username docstring).
# Set true for exactly one deploy/restart, then flip back to false.
if os.getenv("RESET_PASSWORDS_TO_USERNAME") == "true":
    from app.database import SessionLocal as _SessionLocal2
    from scripts.seed import reset_real_user_passwords_to_username

    _reset_db = _SessionLocal2()
    try:
        reset_real_user_passwords_to_username(_reset_db)
    finally:
        _reset_db.close()

app = FastAPI(title="CampusPass")

# Comma-separated list, e.g. "http://localhost:5173,https://campuspass.onrender.com".
# Requests proxied through nginx (Docker/K8s) arrive same-origin and don't need
# CORS at all; this only matters for direct cross-origin calls (local `npm run
# dev` without the Vite proxy, or a frontend/backend split across hosts).
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [origin.strip() for origin in _cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(outpass.router)
app.include_router(security.router)
app.include_router(hod.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
