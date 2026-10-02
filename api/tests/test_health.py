from httpx import AsyncClient


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/api/py/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_routes_require_a_token(client: AsyncClient) -> None:
    response = await client.post("/api/py/structured", json={})

    assert response.status_code == 401
