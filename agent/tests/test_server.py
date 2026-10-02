from httpx import ASGITransport, AsyncClient

from agent.server import create_app


async def post(secret: str | None, started: list[str]) -> int:
    async def start(run_id: str) -> None:
        started.append(run_id)

    app = create_app(start, secret="s3cret")
    headers = {"X-Trigger-Secret": secret} if secret is not None else {}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        res = await c.post("/", json={"run_id": "run-1"}, headers=headers)
    return res.status_code


async def test_starts_the_run_with_the_right_secret() -> None:
    started: list[str] = []

    assert await post("s3cret", started) == 200
    assert started == ["run-1"]


async def test_rejects_a_wrong_secret() -> None:
    started: list[str] = []

    assert await post("guess", started) == 401
    assert started == []


async def test_rejects_a_missing_secret() -> None:
    started: list[str] = []

    assert await post(None, started) == 401
    assert started == []


async def test_rejects_everything_when_no_secret_is_configured() -> None:
    started: list[str] = []

    async def start(run_id: str) -> None:
        started.append(run_id)

    app = create_app(start, secret="")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        res = await c.post("/", json={"run_id": "x"}, headers={"X-Trigger-Secret": ""})

    assert res.status_code == 401
    assert started == []
