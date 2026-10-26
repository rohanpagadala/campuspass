from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import hash_password, require_role
from app.database import get_db
from app.models import ExitLog, Outpass, OutpassStatus, User
from app.qr_tokens import create_qr_token, generate_short_code
from app.schemas import ExitLogAdminOut, OutpassAdminOut, OutpassOut, UserCreate, UserOut

router = APIRouter(prefix="/hod", tags=["hod"])


@router.get("/outpasses", response_model=list[OutpassAdminOut])
def list_all_outpasses(
    status_filter: Optional[OutpassStatus] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod")),
):
    query = db.query(Outpass)
    if status_filter is not None:
        query = query.filter(Outpass.status == status_filter)

    outpasses = query.order_by(Outpass.created_at.desc(), Outpass.id.desc()).all()

    return [
        OutpassAdminOut(
            **OutpassOut.model_validate(outpass).model_dump(),
            student_username=outpass.student.username,
            student_full_name=outpass.student.full_name,
            teacher_username=outpass.teacher.username if outpass.teacher else None,
            teacher_full_name=outpass.teacher.full_name if outpass.teacher else None,
            hod_username=outpass.hod.username if outpass.hod else None,
            hod_full_name=outpass.hod.full_name if outpass.hod else None,
        )
        for outpass in outpasses
    ]


def _get_teacher_approved_outpass_or_error(outpass_id: int, db: Session) -> Outpass:
    outpass = db.query(Outpass).filter(Outpass.id == outpass_id).first()
    if outpass is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outpass not found")
    if outpass.status != OutpassStatus.teacher_approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Outpass is not awaiting HOD approval "
                f"(current status: {outpass.status.value})"
            ),
        )
    return outpass


@router.post("/outpasses/{outpass_id}/approve", response_model=OutpassOut)
def approve_outpass_final(
    outpass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod")),
):
    outpass = _get_teacher_approved_outpass_or_error(outpass_id, db)
    outpass.status = OutpassStatus.approved
    outpass.hod_id = current_user.id
    outpass.hod_decided_at = datetime.now(timezone.utc)
    outpass.qr_token = create_qr_token(outpass.id)

    code = generate_short_code()
    while db.query(Outpass).filter(Outpass.short_code == code).first() is not None:
        code = generate_short_code()
    outpass.short_code = code

    db.commit()
    db.refresh(outpass)
    return outpass


@router.post("/outpasses/{outpass_id}/reject", response_model=OutpassOut)
def reject_outpass_final(
    outpass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod")),
):
    outpass = _get_teacher_approved_outpass_or_error(outpass_id, db)
    outpass.status = OutpassStatus.rejected
    outpass.hod_id = current_user.id
    outpass.hod_decided_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(outpass)
    return outpass


@router.get("/users", response_model=list[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod")),
):
    return db.query(User).order_by(User.id).all()


@router.get("/exit-logs", response_model=list[ExitLogAdminOut])
def list_exit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod")),
):
    logs = db.query(ExitLog).order_by(ExitLog.scanned_at.desc(), ExitLog.id.desc()).all()

    return [
        ExitLogAdminOut(
            id=log.id,
            outpass_id=log.outpass_id,
            scanned_by=log.scanned_by,
            scanned_at=log.scanned_at,
            qr_token_used=log.qr_token_used,
            student_username=log.outpass.student.username,
            student_full_name=log.outpass.student.full_name,
            reason=log.outpass.reason,
            scanned_by_username=log.scanner.username,
            scanned_by_full_name=log.scanner.full_name,
        )
        for log in logs
    ]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod")),
):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    user = User(
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        email=user_in.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod")),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
