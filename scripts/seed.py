"""Dev-only seed script: creates one test user per role if not already present.

Run with:
    python -m scripts.seed
"""

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User, UserRole

SEED_PASSWORD = "password123"

SEED_USERS = [
    {"username": "student1", "full_name": "Test Student", "role": UserRole.student},
    {"username": "teacher1", "full_name": "Test Teacher", "role": UserRole.teacher},
    {"username": "security1", "full_name": "Test Security", "role": UserRole.security},
    {"username": "hod1", "full_name": "Test HOD", "role": UserRole.hod},
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for user_data in SEED_USERS:
            existing = db.query(User).filter(User.username == user_data["username"]).first()
            if existing:
                print(f"skip (already exists): {user_data['username']}")
                continue

            user = User(
                username=user_data["username"],
                hashed_password=hash_password(SEED_PASSWORD),
                full_name=user_data["full_name"],
                role=user_data["role"],
            )
            db.add(user)
            print(f"created: {user_data['username']} ({user_data['role'].value})")

        db.commit()
    finally:
        db.close()

    print(f"\nAll seed users share the password: {SEED_PASSWORD}")


if __name__ == "__main__":
    seed()
