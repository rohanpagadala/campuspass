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
