from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator

from app.models import OutpassStatus, UserRole


class UserBase(BaseModel):
    username: str
    full_name: str
    role: UserRole
    email: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


class OutpassBase(BaseModel):
    reason: str
    requested_exit_time: datetime


class OutpassCreateRequest(OutpassBase):
    @model_validator(mode="after")
    def validate_times(self):
        now = datetime.now(timezone.utc)

        exit_time = self.requested_exit_time
        if exit_time.tzinfo is None:
            exit_time = exit_time.replace(tzinfo=timezone.utc)
        if exit_time < now:
            raise ValueError("requested_exit_time must not be in the past")

        return self


class OutpassOut(OutpassBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    status: OutpassStatus
    teacher_id: Optional[int] = None
    created_at: datetime
    decided_at: Optional[datetime] = None
    hod_id: Optional[int] = None
    hod_decided_at: Optional[datetime] = None
    qr_token: Optional[str] = None
    short_code: Optional[str] = None


class OutpassWithStudent(OutpassOut):
    student_username: str
    student_full_name: str


class OutpassAdminOut(OutpassWithStudent):
    teacher_username: Optional[str] = None
    teacher_full_name: Optional[str] = None
    hod_username: Optional[str] = None
    hod_full_name: Optional[str] = None


class ScanRequest(BaseModel):
    code: str


class ExitLogBase(BaseModel):
    outpass_id: int
    scanned_by: int
    qr_token_used: str


class ExitLogOut(ExitLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scanned_at: datetime


class ExitLogAdminOut(ExitLogOut):
    student_username: str
    student_full_name: str
    reason: str
    scanned_by_username: str
    scanned_by_full_name: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
