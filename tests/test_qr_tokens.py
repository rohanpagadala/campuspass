import time

import pytest

from app.qr_tokens import (
    SHORT_CODE_LENGTH,
    InvalidQRToken,
    create_qr_token,
    decode_qr_token,
    generate_short_code,
)
from app.auth import create_access_token


def test_round_trip():
    token = create_qr_token(outpass_id=42)
    payload = decode_qr_token(token)
    assert payload["outpass_id"] == 42
    assert payload["type"] == "qr"


def test_tampered_token_rejected():
    token = create_qr_token(outpass_id=42)
    tampered = token[:-4] + ("abcd" if token[-4:] != "abcd" else "wxyz")
    with pytest.raises(InvalidQRToken):
        decode_qr_token(tampered)


def test_expired_token_rejected():
    token = create_qr_token(outpass_id=42, valid_minutes=-1)
    with pytest.raises(InvalidQRToken):
        decode_qr_token(token)


def test_expiry_timing():
    # python-jose truncates `exp` to whole seconds, so a sub-second
    # valid_minutes can produce an already-expired (or borderline) token
    # before any sleep even happens. 3s gives enough margin for that
    # truncation and for CI/system scheduling jitter, while still keeping
    # the test fast.
    short_lived = create_qr_token(outpass_id=1, valid_minutes=0.05)  # ~3s
    decode_qr_token(short_lived)  # still valid immediately
    time.sleep(4)
    with pytest.raises(InvalidQRToken):
        decode_qr_token(short_lived)


def test_login_token_rejected_as_qr_token():
    login_token = create_access_token(user_id=1, role="student")
    with pytest.raises(InvalidQRToken):
        decode_qr_token(login_token)


def test_garbage_string_rejected():
    with pytest.raises(InvalidQRToken):
        decode_qr_token("not-a-jwt-at-all")


def test_short_code_shape():
    code = generate_short_code()
    assert len(code) == SHORT_CODE_LENGTH
    assert code.isalnum()
    assert code == code.upper()


def test_short_code_excludes_ambiguous_chars():
    # Generate a bunch and confirm none of the visually-confusable chars
    # (0/O, 1/I/L) ever show up.
    codes = "".join(generate_short_code() for _ in range(200))
    for bad_char in "0O1IL":
        assert bad_char not in codes
