import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.auth import ALGORITHM, SECRET_KEY

QR_TOKEN_TYPE = "qr"
SHORT_CODE_LENGTH = 6
# Uppercase letters + digits, excluding visually ambiguous chars (0/O, 1/I/L)
# since this is meant to be read off a phone screen and typed by hand.
SHORT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class InvalidQRToken(Exception):
    pass


def create_qr_token(outpass_id: int, valid_minutes: int = 120) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "outpass_id": outpass_id,
        "type": QR_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=valid_minutes),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_qr_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise InvalidQRToken("QR token is invalid or expired") from exc

    if payload.get("type") != QR_TOKEN_TYPE:
        raise InvalidQRToken("Token is not a QR token")

    return payload


def generate_short_code() -> str:
    return "".join(secrets.choice(SHORT_CODE_ALPHABET) for _ in range(SHORT_CODE_LENGTH))
