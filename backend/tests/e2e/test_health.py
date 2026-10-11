import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_healthz_endpoint(client: AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "codeatlas"


@pytest.mark.asyncio
async def test_metrics_endpoint(client: AsyncClient) -> None:
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "codeatlas_http_requests_total" in response.text
