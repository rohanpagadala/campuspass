import pytest

from scripts.seed import DEMO_USERS, REAL_USERS, seed_demo_users, seed_real_users


def test_demo_guard_refuses_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(SystemExit) as exc_info:
        seed_demo_users(db=None, credential_lines=[])
    assert exc_info.value.code != 0


def test_demo_users_created_when_not_production(db_session, monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    credential_lines = []
    seed_demo_users(db_session, credential_lines)

    from app.models import User

    for spec in DEMO_USERS:
        user = db_session.query(User).filter(User.username == spec["username"]).first()
        assert user is not None
        assert user.email == spec["email"]

    assert len(credential_lines) == len(DEMO_USERS)


def test_demo_seed_is_idempotent(db_session, monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    seed_demo_users(db_session, [])
    second_run_lines = []
    seed_demo_users(db_session, second_run_lines)
    # Nothing new created the second time - all accounts already existed.
    assert second_run_lines == []


def test_real_users_get_generated_passwords(db_session, monkeypatch):
    for spec in REAL_USERS:
        monkeypatch.delenv(spec["env_var"], raising=False)

    credential_lines = []
    seed_real_users(db_session, credential_lines)

    from app.models import User

    for spec in REAL_USERS:
        user = db_session.query(User).filter(User.username == spec["username"]).first()
        assert user is not None
        assert user.email == spec["email"]

    assert len(credential_lines) == len(REAL_USERS)
    # Every generated password line is unique - no accidental reuse.
    passwords = [line.rsplit("`", 2)[-2] for line in credential_lines]
    assert len(set(passwords)) == len(passwords)


def test_real_user_password_env_override(db_session, monkeypatch):
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "a-specific-override-pass")
    credential_lines = []
    seed_real_users(db_session, credential_lines)

    admin_line = next(line for line in credential_lines if "Admin" in line)
    assert "a-specific-override-pass" in admin_line


def test_real_users_idempotent_password_unchanged(db_session, monkeypatch):
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "first-password-used")
    seed_real_users(db_session, [])

    from app.auth import verify_password
    from app.models import User

    admin = db_session.query(User).filter(User.username == "admin").first()
    assert verify_password("first-password-used", admin.hashed_password)

    # Second run with a DIFFERENT override must not change the existing
    # account's password.
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "second-password-ignored")
    second_lines = []
    seed_real_users(db_session, second_lines)

    db_session.refresh(admin)
    assert verify_password("first-password-used", admin.hashed_password)
    assert second_lines == []
