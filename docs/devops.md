# DevOps

## Git workflow

- `main` is the deployable branch. CI runs on every push and PR; the deploy
  stages (Docker Hub push, Kubernetes/Ansible deploy, Render trigger) only
  fire on a push to `main`, never on a PR, so a PR can't accidentally ship
  anything.
- Feature work happens on short-lived branches off `main`, merged via PR.
  CI (tests + build) is the merge gate.
- Secrets (`SECRET_KEY`, Docker Hub credentials, Render API key/deploy
  hooks) never live in the repo — they're Jenkins credentials, GitHub Actions
  repo secrets, or local `.env` files that are gitignored. `.env.example`
  documents the shape without the values.

## Why each piece exists

| Tool | Why |
|---|---|
| **Docker** | Makes "works on my machine" moot — the backend and frontend run in the same containers in dev, CI, and production. Multi-stage builds keep the shipped images small (no build toolchain in the runtime image). |
| **Docker Compose** | The fastest way to run the *whole* app (both containers + a persistent volume) locally with one command — the dev/demo entry point. |
| **Kubernetes** | The actual deployment target for anything beyond a single machine: restarts a crashed container automatically (liveness probes), won't route traffic to a container that isn't ready yet (readiness probes), and lets the frontend scale to multiple replicas behind one Service while the backend stays at 1 (SQLite + ReadWriteOnce volume can't safely be scaled past a single writer). |
| **Ansible** | Turns "install Docker, install kubectl/minikube, clone the repo, build images, start the cluster, deploy, verify" from a page of manual steps on a fresh machine into one idempotent command. Idempotent means re-running it after a partial failure doesn't redo work or break anything that already succeeded. |
| **Jenkins** | The CI/CD engine that actually runs the pipeline: test → build → push → deploy, gated so deploy only happens on `main` and only after tests pass. |
| **GitHub Actions** | A second, GitHub-native CI pipeline (tests + Docker build on every push/PR, deploy trigger on `main`) — covers the "I don't have a Jenkins server but I pushed to GitHub" case, and is what actually ran in CI for this project during development (no real Jenkins instance was available to execute against). |

## Jenkins pipeline stages

1. **Checkout** — pulls the repo.
2. **Backend: install + pytest** — `pip install -r requirements-dev.txt &&
   pytest tests/ -v --junitxml=...`; JUnit results are published so failures
   show up in Jenkins' test trend UI, not just console logs.
3. **Frontend: install + test + build** — `npm ci && npm run test && npm run
   build`. A broken build fails the pipeline before any image gets built.
4. **Docker: build images** — both images, tagged `:${BUILD_NUMBER}` (for
   traceability — you can always point at the exact image a given build
   produced) and `:latest`.
5. **Docker: push to Docker Hub** — `main` only, behind a Jenkins
   `usernamePassword` credential (`dockerhub-creds`).
6. **Deploy** — `main` only. Shows both the `kubectl apply` path and an
   Ansible-playbook alternative (one active, one commented out) — pick
   whichever matches the real target environment; they're not meant to run
   together.
7. **Deploy: trigger Render** — `main` only. POSTs to each Render service's
   deploy hook URL, held as Jenkins secret-text credentials. This is
   separate from step 6 because Render manages its own deploys once
   triggered — Jenkins doesn't need kubectl/SSH access to Render at all.

## Docker image notes

- **Backend**: multi-stage (`builder` compiles `cryptography`/`bcrypt`'s
  native deps into a venv; the final stage copies just the venv + app code,
  keeping gcc etc. out of the runtime image), runs as a non-root user,
  `HEALTHCHECK` on `/health`, `$PORT` override for platforms like Render
  that assign the port at runtime (defaults to 8000 everywhere else).
- **Frontend**: multi-stage (Node builds the Vite bundle; nginx:alpine
  serves it). The backend's address (`BACKEND_HOST`) is injected into
  nginx's config via `envsubst` at **container start**, not baked in at
  build time — see `architecture.md` for why that matters.

## Kubernetes notes

- `k8s/` manifests are numbered so a plain `kubectl apply -f k8s/` applies
  them in a sane order (namespace before anything that lives in it).
- The backend's non-root container user needs `securityContext.fsGroup` set
  on the pod so the PersistentVolume it writes SQLite to is actually
  writable by that user — most CSI/hostpath provisioners mount a fresh PVC
  root-owned by default, which would otherwise crash the app on startup
  with a permission error the moment it tries to create the DB file.
- `k8s/02-secret.yaml` ships a placeholder value, deliberately — see the
  comments in that file for the one-line `kubectl create secret` command
  that generates a real one without ever touching git.

## Ansible notes

- Split into three roles: `docker` (installs Docker Engine on Ubuntu, idempotent — skips entirely if `docker --version` already succeeds), `kubernetes_tools` (installs the `kubectl`/`minikube` binaries, each guarded by a `stat` check so a second run doesn't re-download anything), and `campuspass_deploy` (clones the repo, builds both images, starts minikube if it isn't already running, loads the images, applies the K8s manifests, waits for rollout, seeds demo accounts, and verifies `/api/health` actually responds before declaring success).
- `ansible-playbook --syntax-check` and `ansible-lint` (at the **production**
  profile) both pass clean.
- `minikube` deliberately never runs as root — the `docker` role adds the
  target user to the `docker` group, and every task in `campuspass_deploy`
  sets `become: false` to run as that regular user.
