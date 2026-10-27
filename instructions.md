# CampusPass — Instructions

This guide assumes you've never run this project before. Every command is
copy-paste ready. Run commands from the project's root folder (the one that
contains this file) unless a step says otherwise.

**Passwords are never written in this file.** They live in `CREDENTIALS.md`,
a file that's created on your machine when you seed the accounts (see
Section 3) and is never committed to git.

---

## 1. What CampusPass is

CampusPass is a digital exit-pass system for a campus. A student requests
permission to leave; a teacher approves it; then an admin (HOD) gives a
second, final approval. Only after both approve does the student get an exit
credential — a QR code and a short backup code — which security checks at
the gate before letting the student out. Each credential works exactly once.

- **Admin** — gives the final approval, manages user accounts, sees
  everything (every request, every exit).
- **Teacher** — gives the first approval on a student's request.
- **Student** — requests to leave campus, and shows the QR/code at the gate.
- **Security** — checks the QR code or short code at the gate and lets the
  student through.

---

## 2. Prerequisites

Install these, then run each check command. You should see a version
number, not an error.

| Tool | Install from | Check command |
|---|---|---|
| Git | https://git-scm.com/downloads | `git --version` |
| Docker Desktop | https://www.docker.com/products/docker-desktop/ | `docker --version` |
| Python 3.11+ | https://www.python.org/downloads/ | `python3 --version` |
| Node.js 20+ | https://nodejs.org/ | `node --version` |
| minikube | https://minikube.sigs.k8s.io/docs/start/ | `minikube version` |
| kubectl | https://kubernetes.io/docs/tasks/tools/ | `kubectl version --client` |

You don't need all of these for every way of running the app — see Section
4 to pick a path. **Docker Compose only needs Docker Desktop.**

If a check command says "command not found," the install didn't finish, or
your terminal needs restarting — close and reopen your terminal and try
again before anything else.

---

## 3. The accounts

| Role | Email | Password |
|---|---|---|
| Admin | rohan.pagadala15@gmail.com | in `CREDENTIALS.md` |
| Teacher | patlollamandeepreddy3183@gmail.com | in `CREDENTIALS.md` |
| Student | rithvikreddy27@gmail.com | in `CREDENTIALS.md` |
| Security | security1 (username, no personal email) | in `CREDENTIALS.md` |

Passwords are never written in this file — see `CREDENTIALS.md`
(gitignored, never committed).

### Creating `CREDENTIALS.md`

`CREDENTIALS.md` doesn't exist until you seed the accounts. Run (adjust for
whichever setup you're using — see Section 4 for the exact seed command for
each):

```bash
python -m scripts.seed
```

This prints each password once and also saves it to `CREDENTIALS.md` at the
project root. **Open that file to see the passwords.** Running the command
again is safe — existing accounts and their passwords are left untouched;
you'll just see "skip (already exists)" for each.

### Logging in

Go to the app's login page and enter **the email address** (or the
username, e.g. `admin`) and the matching password from `CREDENTIALS.md`.
Email is not case-sensitive — `ROHAN.PAGADALA15@GMAIL.COM` works the same as
`rohan.pagadala15@gmail.com`.

### Changing your password

Once logged in, click **Change password** in the top bar, enter your
current password and a new one (at least 8 characters), and save. Use your
new password next time you log in.

### Forgot a password / need to reset one

Two options:

1. **Re-run the seed with an override** (only works if the account doesn't
   exist yet, or if you first delete it and recreate it as an admin — see
   option 2 for an existing account):
   ```bash
   SEED_ADMIN_PASSWORD="a-new-password-you-choose" python -m scripts.seed
   ```
   (Swap `SEED_ADMIN_PASSWORD` for `SEED_TEACHER_PASSWORD`,
   `SEED_STUDENT_PASSWORD`, or `SEED_SECURITY_PASSWORD` for the other
   roles.)
2. **Ask an Admin to create a replacement account**: log in as the Admin,
   go to the **Users** tab, fill in the "Create User" form with a new
   username/email/password for that person, and have them use the new
   account. (There's no built-in "reset an existing user's password"
   button yet — creating a new account is the current workaround.)

---

## 4. Running it

Pick the simplest option that works for you. Docker Compose is recommended
— it needs the least setup.

### 4a. Docker Compose (recommended)

**Build and start:**
```bash
docker compose up --build
```
**Confirm it worked:** wait about 15-20 seconds, then run
```bash
docker compose ps
```
You should see both `campuspass-backend-1` and `campuspass-frontend-1`
listed as `Up ... (healthy)`. If either says `(unhealthy)` or is missing,
see Troubleshooting.

**Seed the accounts** (in a new terminal, same folder):
```bash
docker compose exec backend python -m scripts.seed
```
Expect four `created: ...` lines with passwords, or `skip (already exists)`
if you've seeded before. Then:
```bash
docker compose cp backend:/code/CREDENTIALS.md ./CREDENTIALS.md
```
to copy the passwords file onto your own machine where you can open it.

**Open the app:** http://localhost:5173

**Stop it:**
```bash
docker compose down
```
Your data (accounts, requests) is kept — starting again with
`docker compose up` (no `--build` needed) brings it all back.

**Reset all data** (start completely fresh):
```bash
docker compose down -v
```

### 4b. Local dev without Docker

**Terminal 1 — backend:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Confirm: visit http://127.0.0.1:8000/health — you should see
`{"status":"ok"}`.

**Terminal 2 — seed the accounts** (same venv):
```bash
source .venv/bin/activate
python -m scripts.seed
```

**Terminal 3 — frontend:**
```bash
cd frontend
npm install
npm run dev
```
Confirm: the terminal prints a `Local: http://localhost:5173/` line.

**Open the app:** http://localhost:5173

**Stop it:** `Ctrl+C` in each terminal.

### Camera scanning

Security staff can scan an approved student's QR code directly from the
**Scan with camera** tab on the gate scanner page. Camera access is available
only on an `https://` page or on `http://localhost`/`http://127.0.0.1`; browsers
intentionally block camera access on ordinary insecure network URLs.

To test on a phone, deploy or tunnel the frontend over HTTPS, open the URL in
Safari on iOS or Chrome on Android, sign in as the Security account, open the
Gate Scanner, choose **Scan with camera**, and press **Start camera**. Allow
camera access when prompted. The rear camera is selected by default; use
**Switch camera** when more than one camera is available. If the browser
remembers a denial, open the site's browser/phone settings, enable Camera for
the site, reload the page, and press **Start camera** again.

If there is no camera, the permission remains denied, another app is using the
camera, or the page is not HTTPS, the scanner explains the problem and the
**Enter code manually** tab remains available. Security can paste the full QR
token or enter the student's six-character short code; it uses the same
verification action as camera scanning.

### 4c. Minikube (Kubernetes)

```bash
minikube start --driver=docker
docker build -t campuspass-backend:latest .
docker build -t campuspass-frontend:latest ./frontend
minikube image load campuspass-backend:latest
minikube image load campuspass-frontend:latest
kubectl apply -f k8s/
kubectl set image deployment/campuspass-backend campuspass-backend=campuspass-backend:latest -n campuspass
kubectl set image deployment/campuspass-frontend campuspass-frontend=campuspass-frontend:latest -n campuspass
kubectl rollout status deployment/campuspass-backend -n campuspass
kubectl rollout status deployment/campuspass-frontend -n campuspass
```
**Confirm:** both `rollout status` commands should end with "successfully
rolled out". Then:
```bash
kubectl get pods -n campuspass
```
should show both pods as `1/1 Running`.

**Seed the accounts:**
```bash
kubectl exec -n campuspass deploy/campuspass-backend -- python -m scripts.seed
```
Copy the printed passwords somewhere safe (there's no easy way to copy
`CREDENTIALS.md` out of a Kubernetes pod onto your machine — the simplest
option is reading them straight from this command's output).

**Get the URL:**
```bash
kubectl port-forward -n campuspass svc/campuspass-frontend 30080:80
```
**Open the app:** http://localhost:30080 (leave that command running in its
own terminal — closing it disconnects the app).

**Tear down:**
```bash
kubectl delete namespace campuspass
minikube stop
```

### 4d. Public Render URL

**Live app:** https://campuspass-frontend.onrender.com
**Backend health check:** https://campuspass-backend-mzx8.onrender.com/health

The real accounts (Admin/Teacher/Student/`security1`) are already seeded
there — log in with the emails/username from Section 3 and the passwords
in `CREDENTIALS.md` under "Render (public deployment)".

**How it was deployed:** the repo was pushed to GitHub, then in the Render
dashboard: "New +" → "Blueprint" → pointed at the GitHub repo → Apply.
Render read `render.yaml` and created the Postgres database and both
services automatically.

**How the accounts got seeded with no shell access:** Render's free tier
doesn't offer a shell, so `python -m scripts.seed` can't be run directly
after deploy. Instead, `app/main.py` has a `SEED_ON_STARTUP` env-var-guarded
bootstrap — set to `"true"` for exactly one deploy, it seeded the real
accounts automatically when the app started, printing each new password to
that deploy's logs (the only place to read them on a platform with no
shell). It's since been flipped back to `"false"` in `render.yaml` so it
doesn't keep re-running (harmlessly, since it's idempotent, but
unnecessarily) on every restart. To add a brand-new account later this way
again, you'd flip it back to `"true"` for one deploy via the Render
dashboard's environment tab, then back to `"false"`.

**How to redeploy** after a code change: push to your repo's `main`
branch — if you've connected GitHub Actions deploy hooks (see Section 6),
it redeploys automatically; otherwise redeploy manually from the Render
dashboard ("Manual Deploy" on each service).

**Waking it up before a demo:** Render's free tier puts a service to sleep
after a period of no traffic, and the next request takes roughly 30-60
seconds to wake it. Before showing anyone the app, open
https://campuspass-backend-mzx8.onrender.com/health once and wait for a
response before moving on.

**A real gotcha hit during this deployment, in case it recurs:** the
frontend's nginx proxies `/api/*` to the backend using an address Render
gives it (`BACKEND_HOST`) — but that value is just the backend's internal
slug (e.g. `campuspass-backend-mzx8`), not a complete public hostname, and
Render's edge routing is Host-header-based. Both are already handled in
`frontend/nginx.conf.template` (a `BACKEND_HOST_SUFFIX` completes the
hostname, and the Host header sent upstream is the backend's own, not the
frontend's) - mentioned here only so a future "frontend loads but /api
calls 502" mystery doesn't have to be re-diagnosed from scratch.

---

## 5. Test checklist

Work through this top to bottom. Each line tells you what to run and what
you should see.

1. **Backend tests**
   ```bash
   source .venv/bin/activate   # if not already active
   pip install -r requirements-dev.txt
   pytest tests/ -v
   ```
   Expect: `78 passed` at the bottom (give or take as the suite grows —
   check for `failed` anywhere in the output, which means something's
   wrong).

2. **Frontend tests**
   ```bash
   cd frontend
   npm run test
   ```
   Expect: `Tests  13 passed (13)`.

3. **Frontend build**
   ```bash
   npm run build
   ```
   Expect: ends with `✓ built in ...ms`, no red error text.

4. **Run the app** (pick one path from Section 4) and seed the accounts.

5. **Go through the full lifecycle** using the three real accounts plus
   `security1`:
   - Log in as the **Student**. Submit a request (any reason, any future
     exit time). Expect: it appears under "My Requests" with a yellow
     "Pending" badge.
   - Log out, log in as the **Teacher**. Expect: the request appears in
     the pending list. Click **Approve**. Expect: a confirmation saying
     it was sent to the HOD/Admin for final approval.
   - Log out, log in as the **Admin**. On "All Outpasses," filter by
     "Awaiting HOD." Expect: the request appears. Click **Final
     Approve**. Expect: a confirmation that a QR code and exit code were
     generated.
   - Log out, log in as the **Student** again. Expect: the request now
     shows a green "Approved" badge, a "View QR Code" button, and a
     6-character code next to it. Click the button — expect: an actual
     QR image appears, with the code repeated underneath and a "valid
     until" time.
   - Log out, log in as `security1`. Paste the QR token (or just type the
     6-character code) into the field and click **Verify & Exit**.
     Expect: a green "Exit approved" card showing the student's name and
     reason.
   - Try the exact same code again. Expect: a red "already been used"
     error — this is the single-use guarantee working.

6. **Check the Exit Logs**: log in as the **Admin**, click the "Exit
   Logs" tab. Expect: the scan you just did is listed, with who exited,
   when, and who scanned it (`security1`).

7. **Check persistence**: stop the app (`docker compose down`, no `-v`)
   and start it again (`docker compose up`, no `--build`). Log in as the
   Student again. Expect: the outpass request you submitted earlier is
   still there — nothing was lost.

8. **Check Minikube** (if you set it up in 4c): open
   http://localhost:30080 and repeat step 5's login — expect the same
   behavior as the Docker Compose version.

If every expected result above matches what you actually see, the whole
system is working end to end.

---

## 6. CI/CD, explained simply

**What it does:** every time code is pushed, two robots (Jenkins and GitHub
Actions) automatically run the tests and build the Docker images, so a
broken change gets caught before it reaches anyone. On the `main` branch
only, they can also push the finished images somewhere and trigger a
redeploy.

- **`.github/workflows/ci.yml`** (GitHub Actions) is the one that actually
  ran during this project's development — every push and pull request runs
  the backend tests, frontend tests, frontend build, and a Docker build of
  both images. On `main`, an extra step pings Render to redeploy.
- **`Jenkinsfile`** describes the same pipeline for a self-hosted Jenkins
  server (checkout → test → build → push images to Docker Hub → deploy).
  It's written and ready, but no live Jenkins server was used to run it
  during development — see below for setting one up.

### How to push this project to GitHub

```bash
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/campuspass.git
git push -u origin main
```

### Adding the Docker Hub and Render secrets

These let the automated pipelines push images and trigger deploys on your
behalf. Do this once, in whichever system you're using:

**GitHub** (Settings → Secrets and variables → Actions → "New repository
secret"):
- `RENDER_DEPLOY_HOOK_BACKEND` / `RENDER_DEPLOY_HOOK_FRONTEND` — each
  service's deploy hook URL, from that service's page in the Render
  dashboard under Settings.

**Jenkins** (Manage Jenkins → Credentials → add):
- `dockerhub-creds` — a "Username with password" credential using your
  Docker Hub username and an access token (Docker Hub → Account Settings →
  Security → New Access Token — don't use your actual account password).
- `render-deploy-hook-backend` / `render-deploy-hook-frontend` — "Secret
  text" credentials holding each deploy hook URL.

### Setting up Jenkins from scratch

1. Install Jenkins (the official install guide covers every OS:
   https://www.jenkins.io/doc/book/installing/).
2. On first launch, install these plugins (Manage Jenkins → Plugins):
   **Pipeline**, **Git**, **Docker Pipeline**, **JUnit** (for the test
   result reports), **Credentials Binding**.
3. Create a new item → "Pipeline" → under "Pipeline," choose "Pipeline
   script from SCM," point it at this repo, and set the script path to
   `Jenkinsfile`.
4. Add the credentials listed above (Manage Jenkins → Credentials).
5. Make sure the Jenkins agent itself has Docker installed and the
   Jenkins user can run `docker` commands.
6. Run the pipeline (Build Now) and watch the stage view.

---

## 7. Ansible, explained simply

**What it automates:** everything needed to get CampusPass running on a
brand-new, empty Ubuntu machine — installing Docker, installing
kubectl/minikube, downloading this repo, building the images, starting a
local Kubernetes cluster, deploying the app to it, and checking that it
actually responds — in one command instead of doing each step by hand.

**Running it** (on a fresh Ubuntu machine, or targeting one over SSH):

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
ansible-playbook --syntax-check playbook.yml    # sanity check first
ansible-playbook -i inventory/hosts.ini playbook.yml
```

Before running it for real, open `ansible/playbook.yml` and change
`repo_url` to point at your own fork/copy of this repository, and edit
`ansible/inventory/hosts.ini` to list the real target machine (the file's
comments show the format for a remote host over SSH).

It's **idempotent** — safe to run more than once. If it fails partway
through (e.g. the network drops), just run it again; steps that already
succeeded are skipped or detected as already-done, not repeated.

---

## 8. Troubleshooting

**"Port already in use" / "address already in use"**
Something else on your machine is already using that port. Either stop
that other thing, or tell CampusPass to use a different port:
```bash
BACKEND_PORT=8010 docker compose up --build
```
(Then use `http://localhost:8010` for the backend instead of 8000.)

**Docker commands fail with "Cannot connect to the Docker daemon"**
Docker Desktop isn't running. Open the Docker Desktop app and wait for its
icon to show it's ready, then retry.

**Blank page, or errors mentioning CORS**
Usually means the frontend can't reach the backend. Confirm the backend is
actually running and healthy (`docker compose ps`, or
`curl http://localhost:8000/health`). If you changed `BACKEND_PORT`, make
sure you're visiting the matching frontend URL.

**"Invalid credentials" / "Incorrect username/email or password" on
login**
Double check you're reading the right password from `CREDENTIALS.md` for
the right account (the file lists username, email, and password per
line). Passwords are case-sensitive; email is not. If you've changed the
password since it was generated, use the new one.

**"This code has already been used" at the security gate**
Each QR code/short code works exactly once. Have the student generate a
new approved outpass if they need to exit again — there's no way to reuse
one that's already been scanned.

**QR code or short code seems not to work / "expired"**
QR tokens expire 2 hours after the HOD's final approval. If it's been
longer than that, the request will need to be resubmitted and re-approved.

**Render app is slow to load the first time**
That's the free-tier cold start (see Section 4d) — wait about a minute on
the first request after a period of inactivity.

**Minikube: "image not found" / pods stuck in `ImagePullBackOff`**
The cluster is trying to pull an image from Docker Hub instead of using
the one you built locally. Make sure you ran `minikube image load` for
both images, and that you ran `kubectl set image ...` to point the
Deployments at your locally-built `:latest` tags (see Section 4c).

**How to see logs**
- Docker Compose: `docker compose logs backend` or
  `docker compose logs frontend` (add `-f` to follow live).
- Minikube: `kubectl logs -n campuspass -l app=campuspass-backend` (swap
  `campuspass-backend` for `campuspass-frontend` for the other one).
- Local dev: logs print directly in the terminal where you ran `uvicorn`
  or `npm run dev`.

---

## 9. Glossary

- **Container** — a lightweight, isolated box that runs a program (like
  the backend or frontend) with everything it needs already inside it, so
  it behaves the same on any machine.
- **Image** — the "recipe" a container is built from. You build an image
  once, then can start any number of containers from it.
- **Docker Compose** — a tool that starts and connects several containers
  (here: backend + frontend) together with one command.
- **Kubernetes (K8s)** — a system for running containers on a cluster of
  machines, automatically restarting ones that crash and routing traffic
  only to ones that are ready.
- **Pod** — Kubernetes' smallest unit — usually one running container (plus
  a bit of bookkeeping).
- **Deployment** — a Kubernetes object that says "keep N copies of this pod
  running," and handles rolling out updates.
- **Minikube** — a tool that runs a small, single-machine Kubernetes
  cluster on your own laptop, for testing without needing real
  infrastructure.
- **Pipeline** — an automated sequence of steps (test, build, deploy) that
  runs every time code changes, so humans don't have to do it by hand.
- **JWT (JSON Web Token)** — a signed piece of text that proves who you are
  (or, for a QR code, which outpass it belongs to) without the server
  needing to look anything up first — it can just check the signature.
- **QR token** — the specific JWT encoded into the QR code shown to
  security at the gate; it's signed, time-limited, and becomes invalid the
  instant it's successfully used once.
