import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    security = "security"
    hod = "hod"


class OutpassStatus(str, enum.Enum):
    pending = "pending"
    teacher_approved = "teacher_approved"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    outpasses = relationship(
        "Outpass", back_populates="student", foreign_keys="Outpass.student_id"
    )


class Outpass(Base):
    __tablename__ = "outpasses"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String, nullable=False)
    requested_exit_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(OutpassStatus), nullable=False, default=OutpassStatus.pending)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    decided_at = Column(DateTime(timezone=True), nullable=True)
    hod_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hod_decided_at = Column(DateTime(timezone=True), nullable=True)
    qr_token = Column(String, nullable=True)
    qr_token_used = Column(Boolean, nullable=False, default=False)
    short_code = Column(String, nullable=True, unique=True)

    student = relationship("User", foreign_keys=[student_id], back_populates="outpasses")
    teacher = relationship("User", foreign_keys=[teacher_id])
    hod = relationship("User", foreign_keys=[hod_id])
    exit_logs = relationship("ExitLog", back_populates="outpass")


class ExitLog(Base):
    __tablename__ = "exit_logs"

    id = Column(Integer, primary_key=True, index=True)
    outpass_id = Column(Integer, ForeignKey("outpasses.id"), nullable=False)
    scanned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())
    qr_token_used = Column(String, nullable=False)

    outpass = relationship("Outpass", back_populates="exit_logs")
    scanner = relationship("User", foreign_keys=[scanned_by])
