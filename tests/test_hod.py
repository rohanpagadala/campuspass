from datetime import datetime, timedelta, timezone

from tests.conftest import DEFAULT_PASSWORD, auth_headers


def future_iso(hours=24):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M")


def create_and_teacher_approve(client, student_headers, teacher_headers):
    outpass_id = client.post(
        "/outpass",
        json={"reason": "Trip", "requested_exit_time": future_iso()},
        headers=student_headers,
    ).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    return outpass_id


# --- HOD final approve/reject (stage 2) -------------------------------------


def test_hod_final_approve_generates_qr_and_code(client, student_headers, teacher_headers, hod_headers):
    outpass_id = create_and_teacher_approve(client, student_headers, teacher_headers)
    resp = client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "approved"
    assert body["qr_token"]
    assert body["short_code"]
    assert len(body["short_code"]) == 6


def test_hod_final_reject(client, student_headers, teacher_headers, hod_headers):
    outpass_id = create_and_teacher_approve(client, student_headers, teacher_headers)
    resp = client.post(f"/hod/outpasses/{outpass_id}/reject", headers=hod_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_hod_cannot_approve_still_pending_outpass(client, student_headers, hod_headers):
    outpass_id = client.post(
        "/outpass",
        json={"reason": "Trip", "requested_exit_time": future_iso()},
        headers=student_headers,
    ).json()["id"]
    resp = client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers)
    assert resp.status_code == 409


def test_hod_cannot_approve_already_approved_outpass(client, student_headers, teacher_headers, hod_headers):
    outpass_id = create_and_teacher_approve(client, student_headers, teacher_headers)
    client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers)
    resp = client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers)
    assert resp.status_code == 409


def test_hod_approve_requires_hod_role(client, student_headers, teacher_headers):
    outpass_id = create_and_teacher_approve(client, student_headers, teacher_headers)
    resp = client.post(f"/hod/outpasses/{outpass_id}/approve", headers=teacher_headers)
    assert resp.status_code == 403


def test_hod_approve_nonexistent_404(client, hod_headers):
    resp = client.post("/hod/outpasses/9999/approve", headers=hod_headers)
    assert resp.status_code == 404


# --- outpass listing / filtering --------------------------------------------


def test_hod_lists_all_outpasses_any_status(client, student_headers, teacher_headers, hod_headers):
    create_and_teacher_approve(client, student_headers, teacher_headers)
    resp = client.get("/hod/outpasses", headers=hod_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["status"] == "teacher_approved"


def test_hod_filters_outpasses_by_status(client, student_headers, teacher_headers, hod_headers):
    create_and_teacher_approve(client, student_headers, teacher_headers)
    client.post(
        "/outpass",
        json={"reason": "Still pending", "requested_exit_time": future_iso()},
        headers=student_headers,
    )

    resp = client.get("/hod/outpasses?status=pending", headers=hod_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["reason"] == "Still pending"


def test_hod_outpasses_requires_hod_role(client, teacher_headers):
    resp = client.get("/hod/outpasses", headers=teacher_headers)
    assert resp.status_code == 403


# --- user management ---------------------------------------------------------


def test_hod_creates_user(client, hod_headers):
    resp = client.post(
        "/hod/users",
        json={
            "username": "newstudent",
            "password": DEFAULT_PASSWORD,
            "full_name": "New Student",
            "role": "student",
        },
        headers=hod_headers,
    )
    assert resp.status_code == 201
    assert "hashed_password" not in resp.json()


def test_hod_create_user_duplicate_username_400(client, hod_headers, student):
    resp = client.post(
        "/hod/users",
        json={
            "username": student.username,
            "password": DEFAULT_PASSWORD,
            "full_name": "Dup",
            "role": "student",
        },
        headers=hod_headers,
    )
    assert resp.status_code == 400


def test_hod_lists_users_without_password_hash(client, hod_headers, student):
    resp = client.get("/hod/users", headers=hod_headers)
    assert resp.status_code == 200
    for user in resp.json():
        assert "hashed_password" not in user


def test_hod_deactivates_user_blocks_login(client, hod_headers, student):
    resp = client.patch(f"/hod/users/{student.id}/deactivate", headers=hod_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    login_resp = client.post(
        "/auth/login", data={"username": student.username, "password": DEFAULT_PASSWORD}
    )
    assert login_resp.status_code == 401


def test_hod_cannot_deactivate_self(client, hod_headers, hod):
    resp = client.patch(f"/hod/users/{hod.id}/deactivate", headers=hod_headers)
    assert resp.status_code == 400


def test_deactivate_requires_hod_role(client, teacher_headers, student):
    resp = client.patch(f"/hod/users/{student.id}/deactivate", headers=teacher_headers)
    assert resp.status_code == 403


def test_deactivate_nonexistent_user_404(client, hod_headers):
    resp = client.patch("/hod/users/9999/deactivate", headers=hod_headers)
    assert resp.status_code == 404


# --- exit logs -----------------------------------------------------------


def test_hod_exit_logs_requires_hod_role(client, teacher_headers):
    resp = client.get("/hod/exit-logs", headers=teacher_headers)
    assert resp.status_code == 403


def test_hod_exit_logs_reflects_a_scan(
    client, student_headers, teacher_headers, hod_headers, security_headers
):
    outpass_id = create_and_teacher_approve(client, student_headers, teacher_headers)
    code = client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers).json()[
        "short_code"
    ]
    client.post("/security/scan", json={"code": code}, headers=security_headers)

    resp = client.get("/hod/exit-logs", headers=hod_headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) == 1
    assert logs[0]["scanned_by_username"] == "security1"
    assert logs[0]["student_username"] == "student1"
