from datetime import datetime, timedelta, timezone

from tests.conftest import auth_headers


def future_iso(hours=24):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M")


def past_iso(hours=24):
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M")


def create_outpass(client, headers, reason="Doctor visit", exit_time=None):
    return client.post(
        "/outpass",
        json={"reason": reason, "requested_exit_time": exit_time or future_iso()},
        headers=headers,
    )


# --- creation + validation -------------------------------------------------


def test_student_can_create_outpass(client, student_headers):
    resp = create_outpass(client, student_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    assert body["qr_token"] is None
    assert body["short_code"] is None


def test_create_outpass_rejects_past_exit_time(client, student_headers):
    resp = create_outpass(client, student_headers, exit_time=past_iso())
    assert resp.status_code == 422


def test_create_outpass_requires_student_role(client, teacher_headers):
    resp = create_outpass(client, teacher_headers)
    assert resp.status_code == 403


def test_create_outpass_requires_auth(client):
    resp = client.post(
        "/outpass", json={"reason": "x", "requested_exit_time": future_iso()}
    )
    assert resp.status_code == 401


def test_mine_only_shows_own_outpasses(client, db_session, student_headers):
    create_outpass(client, student_headers)
    from tests.conftest import make_user

    other = make_user(db_session, "student2", "student")
    other_headers = auth_headers(client, other.username)

    resp = client.get("/outpass/mine", headers=other_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# --- teacher approve/reject (stage 1) --------------------------------------


def test_teacher_approve_moves_to_teacher_approved_no_qr_yet(client, student_headers, teacher_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    resp = client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "teacher_approved"
    assert body["qr_token"] is None
    assert body["short_code"] is None


def test_teacher_reject(client, student_headers, teacher_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    resp = client.post(f"/outpass/{outpass_id}/reject", headers=teacher_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_teacher_approve_requires_teacher_role(client, student_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    resp = client.post(f"/outpass/{outpass_id}/approve", headers=student_headers)
    assert resp.status_code == 403


def test_teacher_approve_nonexistent_outpass_404(client, teacher_headers):
    resp = client.post("/outpass/9999/approve", headers=teacher_headers)
    assert resp.status_code == 404


def test_teacher_approve_twice_409(client, student_headers, teacher_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    resp = client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    assert resp.status_code == 409


def test_teacher_reject_after_approve_409(client, student_headers, teacher_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    resp = client.post(f"/outpass/{outpass_id}/reject", headers=teacher_headers)
    assert resp.status_code == 409


# --- QR endpoint only unlocks after BOTH approvals --------------------------


def test_qr_unavailable_before_any_approval(client, student_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    resp = client.get(f"/outpass/{outpass_id}/qr", headers=student_headers)
    assert resp.status_code == 404


def test_qr_unavailable_after_teacher_approval_only(client, student_headers, teacher_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    resp = client.get(f"/outpass/{outpass_id}/qr", headers=student_headers)
    assert resp.status_code == 404


def test_qr_available_after_full_approval(client, student_headers, teacher_headers, hod_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers)
    resp = client.get(f"/outpass/{outpass_id}/qr", headers=student_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"


def test_qr_forbidden_for_other_student(client, db_session, student_headers, teacher_headers, hod_headers):
    outpass_id = create_outpass(client, student_headers).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers)

    from tests.conftest import make_user

    other = make_user(db_session, "student2", "student")
    other_headers = auth_headers(client, other.username)
    resp = client.get(f"/outpass/{outpass_id}/qr", headers=other_headers)
    assert resp.status_code == 403
