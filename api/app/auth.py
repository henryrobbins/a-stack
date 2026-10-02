"""Clerk session-token verification."""

from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer = HTTPBearer(auto_error=False)
_jwks_client: jwt.PyJWKClient | None = None


@dataclass(frozen=True)
class ClerkUser:
    """The caller: their Clerk user id and the session token they sent."""

    sub: str
    token: str


def _jwks() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(settings.clerk_jwks_url, cache_jwk_set=True)
    return _jwks_client


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> ClerkUser:
    """Validate the Clerk session token in the Authorization header.

    Raises a 401 when the header is missing or the token is invalid, expired,
    or has no subject.
    """
    if credentials is None:
        raise _unauthorized("Missing bearer token")
    token = credentials.credentials
    try:
        key = _jwks().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token, key.key, algorithms=["RS256"], options={"verify_aud": False}
        )
    except jwt.PyJWTError as exc:
        raise _unauthorized("Invalid or expired token") from exc
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        raise _unauthorized("Token missing subject")
    return ClerkUser(sub=sub, token=token)
