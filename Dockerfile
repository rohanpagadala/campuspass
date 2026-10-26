# --- builder stage: compile deps (bcrypt/cryptography need build tools) into a venv ---
FROM python:3.12-slim AS builder

WORKDIR /code

RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- final stage: slim runtime image, just the venv + app code ---
FROM python:3.12-slim

WORKDIR /code

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY app ./app
COPY scripts ./scripts

# SQLite lives here; mount a volume at this path to persist data across restarts
RUN mkdir -p /code/data \
    && groupadd --system app && useradd --system --gid app --home /code app \
    && chown -R app:app /code

USER app

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT','8000') + '/health')" || exit 1

# Table creation runs automatically on import (see app/main.py), no separate
# migration step needed for this SQLAlchemy-only setup. Shell form so $PORT
# (set by platforms like Render) overrides the 8000 default used everywhere
# else (Docker Compose, Kubernetes).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
