from tests.conftest import DEFAULT_PASSWORD, auth_headers, login


def test_login_success(client, student):
    resp = login(client, student.username)
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["role"] == "student"


def test_login_wrong_password(client, student):
    resp = login(client, student.username, password="wrong-password")
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = login(client, "nobody")
    assert resp.status_code == 401


def test_deactivated_user_cannot_login(client, db_session, student):
    student.is_active = False
    db_session.commit()

    resp = login(client, student.username)
    assert resp.status_code == 401
    assert "deactivated" in resp.json()["detail"].lower()


def test_deactivated_user_token_rejected_mid_session(client, db_session, student):
    headers = auth_headers(client, student.username)
    assert client.get("/auth/me", headers=headers).status_code == 200

    student.is_active = False
    db_session.commit()

    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 403


def test_no_token_rejected(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_invalid_token_rejected(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer garbage.not.a.token"})
    assert resp.status_code == 401


def test_me_returns_correct_role(client, teacher):
    headers = auth_headers(client, teacher.username)
    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "teacher"


def test_register_endpoint_removed(client):
    # Closed off once HOD-only user creation was added - open self-registration
    # should no longer exist.
    resp = client.post(
        "/auth/register",
        json={"username": "x", "password": DEFAULT_PASSWORD, "full_name": "X", "role": "hod"},
    )
    assert resp.status_code == 404


# --- email login -------------------------------------------------------


def test_login_with_email(client, student):
    resp = login(client, student.email)
    assert resp.status_code == 200
    assert resp.json()["role"] == "student"


def test_login_with_email_different_case(client, student):
    assert student.email == student.email.lower()
    resp = login(client, student.email.upper())
    assert resp.status_code == 200


def test_login_with_mixed_case_email(client, student):
    mixed = student.email[0].upper() + student.email[1:]
    resp = login(client, mixed)
    assert resp.status_code == 200


def test_login_with_wrong_email_404_shaped_as_401(client):
    resp = login(client, "nobody@example.com")
    assert resp.status_code == 401


def test_email_is_stored_lowercase(db_session):
    from tests.conftest import make_user

    user = make_user(db_session, "mixedcaseuser", "student", email="MixedCase@Example.COM")
    assert user.email == "mixedcase@example.com"


# --- change password -----------------------------------------------------


def test_change_password_success(client, student_headers, student):
    resp = client.post(
        "/auth/change-password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "brand-new-pass-1"},
        headers=student_headers,
    )
    assert resp.status_code == 200

    # old password no longer works, new one does
    assert login(client, student.username, password=DEFAULT_PASSWORD).status_code == 401
    assert login(client, student.username, password="brand-new-pass-1").status_code == 200


def test_change_password_wrong_current_password(client, student_headers):
    resp = client.post(
        "/auth/change-password",
        json={"current_password": "totally-wrong", "new_password": "brand-new-pass-1"},
        headers=student_headers,
    )
    assert resp.status_code == 401


def test_change_password_too_short_422(client, student_headers):
    resp = client.post(
        "/auth/change-password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "short1"},
        headers=student_headers,
    )
    assert resp.status_code == 422


def test_change_password_requires_auth(client):
    resp = client.post(
        "/auth/change-password",
        json={"current_password": "x", "new_password": "new-password-1"},
    )
    assert resp.status_code == 401
