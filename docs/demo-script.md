# Demo script (under 5 minutes)

Assumes `docker compose up --build` is already running (or the public Render
URL is already warmed up — see the README's cold-start note) and the real
accounts have been seeded (`python -m scripts.seed` / `docker compose exec
backend python -m scripts.seed`). Passwords are in the gitignored
`CREDENTIALS.md` — see `instructions.md` for how to get it. Log in with
email for admin/teacher/student, or the username for security:

- Admin: rohan.pagadala15@gmail.com
- Teacher: patlollamandeepreddy3183@gmail.com
- Student: rithvikreddy27@gmail.com
- Security: `security1`

## 0. One-line pitch (15s)

"CampusPass is a digital outpass system with a two-stage approval — teacher,
then admin — and the exit gate takes either a QR scan or a typed 6-character
code, since QR scanning isn't always reliable in practice."

## 1. Student requests an exit (45s)

1. Open the app, log in as the Student.
2. Fill in a reason ("Doctor's appointment") and an exit time a few hours
   from now.
3. Submit. Point out the status badge: **Pending**.
4. Log out.

## 2. Teacher: first approval (30s)

1. Log in as the Teacher.
2. The request appears in the pending list. Click **Approve**.
3. Point out the confirmation text: *"sent to HOD for final approval"* —
   this is stage one, not the final decision.
4. Log out.

## 3. Admin: second approval, QR + code generated (45s)

1. Log in as the Admin.
2. On the **All Outpasses** tab, switch the filter to "Awaiting HOD" — the
   request is sitting there, not yet exitable.
3. Click **Final Approve**. This is the moment the QR and short code are
   actually generated — not at the teacher's approval.
4. Briefly show the **Users** and **Exit Logs** tabs exist (don't dwell).
5. Log out.

## 4. Student: the exit credential (30s)

1. Log back in as the Student.
2. Status badge is now **Approved**, with a **View QR Code** button and a
   visible 6-character code next to it.
3. Click it — show the actual QR image and the code directly underneath,
   plus the "valid until" expiry time.
4. Log out.

## 5. Security: the gate (45s)

1. Log in as `security1`.
2. Type the 6-character code (not the QR) into the "QR token or exit code"
   field — this is the point: a guard whose scanner is having a bad day can
   still let someone through, with the same checks either way.
3. Click **Verify & Exit** — green "Exit approved" card with the student's
   name, reason, and exit time.
4. Try the *same* code again — red "already been used" error. This is the
   single-use guarantee: once used, that credential is dead, scan or no
   scan.
5. Log out.

## 6. Admin: the audit trail (30s)

1. Log in as the Admin again.
2. **Exit Logs** tab — the scan just performed is there: who exited, when,
   who scanned it.
3. (Optional, if time remains) Show **Users** tab's Deactivate button, and
   mention it blocks both future logins and any already-issued token on its
   very next request — not just new sign-ins. Also point out the "Change
   password" button in the top bar, available to every role.

## If something's slow

- Render free tier cold start: hit the backend's `/api/health` once, ~30-60s
  before the actual demo starts, to warm it up (see README).
- If a step 404s/500s, it's almost always a stale `.env`/image — fall back
  to `docker compose up --build` locally, which is always the most reliable
  path for a live demo.
- Forgot a password? It's in `CREDENTIALS.md` — see `instructions.md` §3 if
  that file doesn't exist yet or needs regenerating.
