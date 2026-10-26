import os

# Must happen before `app.main` (or anything importing it) is loaded, since
# app.database builds its engine from this env var at import time. Pointing
# it at an in-memory DB here means the module-level `Base.metadata.create_all`
# in app.main touches a throwaway DB, not a real file on disk - every test
# below uses its own isolated temp-file DB via the get_db override instead.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth import hash_password
from app.database import Base, get_db
from app.main import app
from app.models import User, UserRole


@pytest.fixture()
def db_session(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


DEFAULT_PASSWORD = "pass1234"


def make_user(db_session, username, role, *, password=DEFAULT_PASSWORD, is_active=True):
    user = User(
        username=username,
        hashed_password=hash_password(password),
        full_name=f"Test {username}",
        role=UserRole(role),
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def login(client, username, password=DEFAULT_PASSWORD):
    resp = client.post("/auth/login", data={"username": username, "password": password})
    return resp


def auth_headers(client, username, password=DEFAULT_PASSWORD):
    resp = login(client, username, password)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def student(db_session):
    return make_user(db_session, "student1", "student")


@pytest.fixture()
def teacher(db_session):
    return make_user(db_session, "teacher1", "teacher")


@pytest.fixture()
def security_guard(db_session):
    return make_user(db_session, "security1", "security")


@pytest.fixture()
def hod(db_session):
    return make_user(db_session, "hod1", "hod")


@pytest.fixture()
def student_headers(client, student):
    return auth_headers(client, student.username)


@pytest.fixture()
def teacher_headers(client, teacher):
    return auth_headers(client, teacher.username)


@pytest.fixture()
def security_headers(client, security_guard):
    return auth_headers(client, security_guard.username)


@pytest.fixture()
def hod_headers(client, hod):
    return auth_headers(client, hod.username)
