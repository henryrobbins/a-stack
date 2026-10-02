"""Shared fixtures.

Clerk is replaced at its boundary: tokens are signed with a test RSA key whose
JWKS is served from a local HTTP server. Supabase is the real local instance; data
tests reach it with HS256 tokens signed by the local JWT secret, which local
Supabase accepts alongside Clerk tokens, so RLS runs for real.
"""

import json
import os
import subprocess
import threading
import uuid
from collections.abc import AsyncIterator, Iterator
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

# CI exports Supabase settings; locally they come from the running instance.
if "SUPABASE_SECRET_KEY" not in os.environ:
    _status = json.loads(
        subprocess.run(
            ["supabase", "status", "-o", "json"],
            cwd=Path(__file__).parents[2] / "supabase",
            capture_output=True,
            check=True,
            text=True,
        ).stdout
    )
    os.environ.update(
        SUPABASE_URL=_status["API_URL"],
        SUPABASE_PUBLISHABLE_KEY=_status["PUBLISHABLE_KEY"],
        SUPABASE_SECRET_KEY=_status["SECRET_KEY"],
        SUPABASE_JWT_SECRET=_status["JWT_SECRET"],
    )

CLERK_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(CLERK_KEY.public_key()))
_JWKS = json.dumps({"keys": [{**_jwk, "kid": "test", "use": "sig"}]}).encode()


class _JWKSHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(_JWKS)

    def log_message(self, *args: object) -> None:
        pass


_jwks_server = HTTPServer(("127.0.0.1", 0), _JWKSHandler)
threading.Thread(target=_jwks_server.serve_forever, daemon=True).start()
os.environ["CLERK_JWKS_URL"] = (
    f"http://127.0.0.1:{_jwks_server.server_port}/.well-known/jwks.json"
)

from fastapi.testclient import TestClient  # noqa: E402
from supabase import AsyncClient, acreate_client  # noqa: E402

from app.main import app  # noqa: E402


def clerk_token(sub: str, key: rsa.RSAPrivateKey = CLERK_KEY, **claims: object) -> str:
    """An RS256 session token as Clerk would issue it."""
    return jwt.encode(
        {"sub": sub, "exp": 2**31 - 1, **claims},
        key,
        algorithm="RS256",
        headers={"kid": "test"},
    )


def supabase_token(sub: str) -> str:
    """An HS256 token for `sub` that local Supabase accepts."""
    return jwt.encode(
        {"sub": sub, "role": "authenticated", "aud": "authenticated", "exp": 2**31 - 1},
        os.environ["SUPABASE_JWT_SECRET"],
        algorithm="HS256",
    )


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def admin() -> AsyncClient:
    return await acreate_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"]
    )


@pytest.fixture
async def make_user(admin: AsyncClient) -> AsyncIterator[object]:
    """Creates users rows; deleting them afterwards cascades to their data."""
    created: list[str] = []

    async def make() -> str:
        sub = f"test_user_{uuid.uuid4()}"
        await admin.table("users").insert({"clerk_user_id": sub}).execute()
        created.append(sub)
        return sub

    yield make
    if created:
        await admin.table("users").delete().in_("clerk_user_id", created).execute()
