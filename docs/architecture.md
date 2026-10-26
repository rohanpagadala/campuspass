# Architecture

## Components

```
Browser
  │
  ▼
nginx (frontend container)
  ├─ serves the built React (Vite) SPA as static files
  └─ proxies /api/* to the backend, same-origin from the browser's view
  │
  ▼
FastAPI (backend container)
  ├─ app/main.py        app entrypoint, CORS, table creation on startup
  ├─ app/auth.py         password hashing, JWT create/verify, role dependency
  ├─ app/qr_tokens.py     QR JWT + short-code generation/verification
  ├─ app/models.py        SQLAlchemy models
  ├─ app/schemas.py       Pydantic request/response schemas + validators
  └─ app/routers/
       auth.py      login, /auth/me
       outpass.py   student create/list, teacher approve/reject, QR image
       hod.py        HOD final approve/reject, user admin, listings
       security.py   gate scan (QR token or short code)
  │
  ▼
SQLite (dev/Docker/K8s: file on a persistent volume)
  or Postgres (Render / any DATABASE_URL override)
```

The frontend never talks to the backend by an absolute URL it has baked in.
It calls a relative `/api/...` path; whatever is sitting in front of it
(nginx in Docker/K8s, Vite's dev proxy locally) resolves that to the actual
backend. This is why the frontend image doesn't need a build-time
`VITE_API_URL` — the backend's address is a *runtime* concern, configured via
an env var on the proxy, not baked into the JS bundle.

## Data model

**User** — `id, username, hashed_password, role (student|teacher|security|hod),
full_name, email, is_active, created_at`. `email` is required, unique, and
normalized to lowercase on write (Pydantic `field_validator`); `/auth/login`
accepts either the username or the email (case-insensitive on the email
side) as the identifier. `is_active=False` blocks both new logins and any
still-valid existing token on its next request. A logged-in user can replace
their own password via `POST /auth/change-password` (current password +
new, min 8 chars) — surfaced as a "Change password" control in the shared
dashboard header for every role.

**Outpass** — the core lifecycle record.

| Field | Notes |
|---|---|
| `student_id` | who requested it |
| `reason`, `requested_exit_time` | the request itself (no return time — removed; this is a one-way exit pass, not a round-trip booking) |
| `status` | `pending → teacher_approved → approved` (or `rejected` at either approval stage), `expired` reserved for future use |
| `teacher_id`, `decided_at` | first-stage (teacher) decision |
| `hod_id`, `hod_decided_at` | second-stage (HOD) decision — only an outpass that reaches `approved` has these set |
| `qr_token`, `short_code` | generated together, only at the moment HOD gives final approval |
| `qr_token_used` | flips to `True` the instant a security guard successfully scans/verifies it — makes the exit single-use |

**ExitLog** — one row per successful gate scan: `outpass_id, scanned_by,
scanned_at, qr_token_used` (the literal code/token string that was presented,
kept for an audit trail).

### Why two approval stages

A teacher approving alone used to be sufficient to generate the QR. It now
only moves the request to `teacher_approved` — a holding state. The actual
exit credential (QR + short code) isn't minted until the HOD gives a
*second*, independent approval. This means a compromised or mistaken teacher
account can't unilaterally produce a working exit credential; the HOD is a
real second check, not just a dashboard that happens to also show approved
requests.

## QR token security properties

The QR encodes a signed JWT (HS256, same signing key as login tokens, but a
distinct `type: "qr"` claim so a login token can never be replayed as an
exit credential and vice versa — enforced by `decode_qr_token` rejecting any
token whose `type` doesn't match).

- **Authenticity** — the token is HMAC-signed with `SECRET_KEY`. A guard (or
  attacker) cannot forge one without the key; any tampering invalidates the
  signature and `decode_qr_token` raises.
- **Freshness** — every QR token carries `iat`/`exp` claims and defaults to a
  2-hour validity window (`create_qr_token(..., valid_minutes=120)`). An
  expired token is rejected at scan time regardless of whether the exit
  itself was otherwise valid.
- **Single-use** — `Outpass.qr_token_used` is checked and flipped atomically
  (within the same DB transaction as the `ExitLog` insert) on a successful
  scan. A second presentation of the same QR or short code — whether by the
  same student trying to "re-exit" or anyone else who saw it — is rejected
  with a specific "already used" message, not a silent success.
- **Scoped to the exact token on record** — even a *cryptographically valid*
  QR token for the right outpass ID is rejected (409, "does not match") if
  it isn't the one currently stored on that outpass. This defends against a
  stale/superseded token still being accepted after a (hypothetical) future
  token-rotation feature.

### The short code

Every QR also gets a paired 6-character alphanumeric code (uppercase,
excluding visually ambiguous characters `0/O` and `1/I/L`), generated at the
same moment as the QR and shown directly underneath it. It exists because
QR scanning isn't always reliable (bad lighting, a cracked camera, a
guard's phone acting up) — the code is accepted as a full equivalent of the
QR at `/security/scan`, which tries to decode the input as a QR token first
and falls back to a short-code lookup if that fails. Both paths converge on
the same status/used/mismatch checks, so neither is a weaker path than the
other.

## Frontend

React 19 + Vite, Tailwind for styling, React Router for the four role
dashboards (`/student`, `/teacher`, `/security`, `/hod`), each gated by
`ProtectedRoute` checking both authentication and role. `AuthContext` keeps
the JWT and current user in React state, synced with `localStorage`, and
re-fetches `/auth/me` on page load/refresh.
