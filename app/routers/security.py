from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.models import ExitLog, Outpass, OutpassStatus, User
from app.qr_tokens import InvalidQRToken, decode_qr_token
from app.schemas import OutpassOut, OutpassWithStudent, ScanRequest

router = APIRouter(prefix="/security", tags=["security"])


@router.post("/scan", response_model=OutpassWithStudent)
def scan_code(
    scan_in: ScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("security")),
):
    # Accepts either the full signed QR token or the short numeric code -
    # whichever the guard has on hand. A string that isn't a valid QR token
    # falls through to a short-code lookup instead of failing outright.
    raw = scan_in.code.strip()
    outpass = None
    token_mismatch = False

    try:
        payload = decode_qr_token(raw)
        candidate = db.query(Outpass).filter(Outpass.id == payload["outpass_id"]).first()
        if candidate is None:
            pass
        elif candidate.qr_token == raw:
            outpass = candidate
        elif candidate.status == OutpassStatus.approved:
            # A real current token exists on this (approved) record and this
            # one isn't it - a genuine mismatch.
            token_mismatch = True
        else:
            # Valid, well-formed token for the right outpass, but it hasn't
            # reached "approved" yet, so there's no current token to compare
            # against. Let the status check below report the clearer reason.
            outpass = candidate
    except InvalidQRToken:
        outpass = (
            db.query(Outpass).filter(Outpass.short_code == raw.upper()).first()
        )

    if token_mismatch:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="QR token does not match this outpass's current token",
        )
    if outpass is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid QR token or code",
        )

    if outpass.status != OutpassStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Outpass is not approved (current status: {outpass.status.value})",
        )
    if outpass.qr_token_used:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This code has already been used",
        )

    outpass.qr_token_used = True
    exit_log = ExitLog(
        outpass_id=outpass.id,
        scanned_by=current_user.id,
        scanned_at=datetime.now(timezone.utc),
        qr_token_used=raw,
    )
    db.add(exit_log)
    db.commit()
    db.refresh(outpass)

    return OutpassWithStudent(
        **OutpassOut.model_validate(outpass).model_dump(),
        student_username=outpass.student.username,
        student_full_name=outpass.student.full_name,
    )
