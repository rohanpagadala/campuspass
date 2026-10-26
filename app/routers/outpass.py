import io
from datetime import datetime, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.models import Outpass, OutpassStatus, User
from app.schemas import OutpassCreateRequest, OutpassOut, OutpassWithStudent

router = APIRouter(prefix="/outpass", tags=["outpass"])


@router.post("", response_model=OutpassOut, status_code=status.HTTP_201_CREATED)
def create_outpass(
    outpass_in: OutpassCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    outpass = Outpass(
        student_id=current_user.id,
        reason=outpass_in.reason,
        requested_exit_time=outpass_in.requested_exit_time,
        status=OutpassStatus.pending,
    )
    db.add(outpass)
    db.commit()
    db.refresh(outpass)
    return outpass


@router.get("/mine", response_model=list[OutpassOut])
def list_my_outpasses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    return (
        db.query(Outpass)
        .filter(Outpass.student_id == current_user.id)
        .order_by(Outpass.created_at.desc(), Outpass.id.desc())
        .all()
    )


@router.get("/pending", response_model=list[OutpassWithStudent])
def list_pending_outpasses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    outpasses = (
        db.query(Outpass)
        .filter(Outpass.status == OutpassStatus.pending)
        .order_by(Outpass.created_at.desc(), Outpass.id.desc())
        .all()
    )
    return [
        OutpassWithStudent(
            **OutpassOut.model_validate(outpass).model_dump(),
            student_username=outpass.student.username,
            student_full_name=outpass.student.full_name,
        )
        for outpass in outpasses
    ]


def _get_pending_outpass_or_error(outpass_id: int, db: Session) -> Outpass:
    outpass = db.query(Outpass).filter(Outpass.id == outpass_id).first()
    if outpass is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outpass not found")
    if outpass.status != OutpassStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Outpass has already been {outpass.status.value}",
        )
    return outpass


@router.post("/{outpass_id}/approve", response_model=OutpassOut)
def approve_outpass(
    outpass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    outpass = _get_pending_outpass_or_error(outpass_id, db)
    outpass.status = OutpassStatus.teacher_approved
    outpass.teacher_id = current_user.id
    outpass.decided_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(outpass)
    return outpass


@router.post("/{outpass_id}/reject", response_model=OutpassOut)
def reject_outpass(
    outpass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    outpass = _get_pending_outpass_or_error(outpass_id, db)
    outpass.status = OutpassStatus.rejected
    outpass.teacher_id = current_user.id
    outpass.decided_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(outpass)
    return outpass


@router.get("/{outpass_id}/qr")
def get_outpass_qr(
    outpass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    outpass = db.query(Outpass).filter(Outpass.id == outpass_id).first()
    if outpass is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outpass not found")
    if outpass.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this outpass",
        )
    if outpass.status != OutpassStatus.approved or not outpass.qr_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No QR code available for this outpass",
        )

    img = qrcode.make(outpass.qr_token)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")
