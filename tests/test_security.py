from datetime import datetime, timedelta, timezone

from app.qr_tokens import create_qr_token


def future_iso(hours=24):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M")


def full_approve(client, student_headers, teacher_headers, hod_headers, reason="Trip"):
    outpass_id = client.post(
        "/outpass",
        json={"reason": reason, "requested_exit_time": future_iso()},
        headers=student_headers,
    ).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)
    approved = client.post(f"/hod/outpasses/{outpass_id}/approve", headers=hod_headers).json()
    return approved


def test_scan_with_short_code_succeeds(client, student_headers, teacher_headers, hod_headers, security_headers):
    outpass = full_approve(client, student_headers, teacher_headers, hod_headers)
    resp = client.post(
        "/security/scan", json={"code": outpass["short_code"]}, headers=security_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["student_username"] == "student1"
    assert body["reason"] == "Trip"


def test_scan_with_qr_token_succeeds(client, student_headers, teacher_headers, hod_headers, security_headers):
    outpass = full_approve(client, student_headers, teacher_headers, hod_headers)
    resp = client.post(
        "/security/scan", json={"code": outpass["qr_token"]}, headers=security_headers
    )
    assert resp.status_code == 200


def test_scan_lowercase_short_code_still_matches(
    client, student_headers, teacher_headers, hod_headers, security_headers
):
    outpass = full_approve(client, student_headers, teacher_headers, hod_headers)
    resp = client.post(
        "/security/scan",
        json={"code": outpass["short_code"].lower()},
        headers=security_headers,
    )
    assert resp.status_code == 200


def test_scan_same_code_twice_409_already_used(
    client, student_headers, teacher_headers, hod_headers, security_headers
):
    outpass = full_approve(client, student_headers, teacher_headers, hod_headers)
    client.post("/security/scan", json={"code": outpass["short_code"]}, headers=security_headers)
    resp = client.post(
        "/security/scan", json={"code": outpass["short_code"]}, headers=security_headers
    )
    assert resp.status_code == 409
    assert "already" in resp.json()["detail"].lower()


def test_scan_not_yet_approved_409(client, student_headers, teacher_headers, security_headers):
    outpass_id = client.post(
        "/outpass",
        json={"reason": "Trip", "requested_exit_time": future_iso()},
        headers=student_headers,
    ).json()["id"]
    client.post(f"/outpass/{outpass_id}/approve", headers=teacher_headers)  # only stage 1

    token = create_qr_token(outpass_id)  # simulate having a token before final approval
    resp = client.post("/security/scan", json={"code": token}, headers=security_headers)
    assert resp.status_code == 409
    assert "not approved" in resp.json()["detail"].lower()


def test_scan_expired_token_400(
    client, student_headers, teacher_headers, hod_headers, security_headers
):
    full_approve(client, student_headers, teacher_headers, hod_headers)
    expired = create_qr_token(outpass_id=1, valid_minutes=-1)
    resp = client.post("/security/scan", json={"code": expired}, headers=security_headers)
    assert resp.status_code == 400


def test_scan_garbage_code_400(client, security_headers):
    resp = client.post("/security/scan", json={"code": "not-a-real-code"}, headers=security_headers)
    assert resp.status_code == 400


def test_scan_requires_security_role(client, student_headers):
    resp = client.post("/security/scan", json={"code": "ABC123"}, headers=student_headers)
    assert resp.status_code == 403


def test_scan_token_mismatch_409(
    client, db_session, student_headers, teacher_headers, hod_headers, security_headers
):
    from app.models import Outpass

    outpass = full_approve(client, student_headers, teacher_headers, hod_headers)
    old_token = outpass["qr_token"]

    # Simulate the stored token no longer being the one in hand (e.g. it was
    # regenerated) - old_token still decodes fine and points at the right,
    # already-approved outpass, but no longer matches what's on record.
    db_row = db_session.query(Outpass).filter(Outpass.id == outpass["id"]).first()
    db_row.qr_token = "a-different-current-token"
    db_session.commit()

    resp = client.post("/security/scan", json={"code": old_token}, headers=security_headers)
    assert resp.status_code == 409
    assert "does not match" in resp.json()["detail"].lower()
