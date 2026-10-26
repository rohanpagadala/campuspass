import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401  ensures models are registered before create_all
from app.routers import auth, hod, outpass, security

Base.metadata.create_all(bind=engine)

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
