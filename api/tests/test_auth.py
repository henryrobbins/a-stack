import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import ClerkUser, verify_clerk_token
from tests.conftest import clerk_token


def bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


async def test_valid_token_returns_user() -> None:
    token = clerk_token("user_123")

    user = await verify_clerk_token(bearer(token))

    assert user == ClerkUser(sub="user_123", token=token)


async def test_missing_credentials_rejected() -> None:
    with pytest.raises(HTTPException) as exc:
        await verify_clerk_token(None)
    assert exc.value.status_code == 401


async def test_malformed_token_rejected() -> None:
    with pytest.raises(HTTPException) as exc:
        await verify_clerk_token(bearer("not-a-jwt"))
    assert exc.value.status_code == 401


async def test_token_from_unknown_key_rejected() -> None:
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    with pytest.raises(HTTPException) as exc:
        await verify_clerk_token(bearer(clerk_token("user_123", key=other)))
    assert exc.value.status_code == 401


async def test_expired_token_rejected() -> None:
    with pytest.raises(HTTPException) as exc:
        await verify_clerk_token(bearer(clerk_token("user_123", exp=1)))
    assert exc.value.status_code == 401


async def test_token_without_subject_rejected() -> None:
    with pytest.raises(HTTPException) as exc:
        await verify_clerk_token(bearer(clerk_token("")))
    assert exc.value.status_code == 401
