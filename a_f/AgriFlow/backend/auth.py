"""
Login helpers: password hashing, signed login tokens and "who is logged in?".
Only Python's standard library is used, so there is nothing extra to install.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import models
from database import BASE_DIR, get_db

TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60   # a login lasts 7 days


# ---------- Secret key ----------
def _load_secret() -> bytes:
    """Use the AGRIFLOW_SECRET env variable, or create a random key file once."""
    env_secret = os.environ.get("AGRIFLOW_SECRET")
    if env_secret:
        return env_secret.encode()

    key_path = os.path.join(BASE_DIR, "secret.key")
    if not os.path.exists(key_path):
        with open(key_path, "w") as f:
            f.write(secrets.token_hex(32))
    with open(key_path) as f:
        return f.read().strip().encode()


SECRET = _load_secret()


# ---------- Passwords ----------
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000)
        return hmac.compare_digest(digest.hex(), expected)
    except ValueError:
        return False


# ---------- Tokens (signed, expiring) ----------
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def create_token(user_id: int) -> str:
    payload = _b64(json.dumps({"uid": user_id, "exp": int(time.time()) + TOKEN_LIFETIME_SECONDS}).encode())
    signature = _b64(hmac.new(SECRET, payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{signature}"


def decode_token(token: str) -> Optional[int]:
    """Returns the user id if the token is genuine and not expired, else None."""
    try:
        payload, signature = token.split(".")
        expected = _b64(hmac.new(SECRET, payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            return None
        data = json.loads(_unb64(payload))
        if data["exp"] < time.time():
            return None
        return int(data["uid"])
    except (ValueError, KeyError, TypeError):
        return None


# ---------- FastAPI dependencies ----------
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Please log in first.")
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Your session expired. Please log in again.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Account not found. Please log in again.")
    return user


def require_role(*allowed_roles: str):
    """Use as: Depends(require_role('farmer')) to limit an endpoint to some roles."""

    def checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Only " + " or ".join(allowed_roles) + " accounts can do this.",
            )
        return user

    return checker
