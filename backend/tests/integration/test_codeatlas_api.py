from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_graph(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/graph")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
    assert "auth/middleware.py:AuthMiddleware" in data["nodes"]


@pytest.mark.asyncio
async def test_filter_graph_by_module(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/graph?module=orders")
    assert resp.status_code == 200
    data = resp.json()
    assert all(n["module"] == "orders" for n in data["nodes"].values())


@pytest.mark.asyncio
async def test_get_subgraph(client: AsyncClient) -> None:
    symbol_id = "orders/order_processor.py:OrderProcessor.checkout"
    resp = await client.get(f"/api/v1/graph/subgraph/{symbol_id}?depth=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["root_symbol_id"] == symbol_id
    assert len(data["nodes"]) >= 2


@pytest.mark.asyncio
async def test_symbols_search(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/symbols?q=checkout")
    assert resp.status_code == 200
    symbols = resp.json()
    assert len(symbols) >= 1
    assert any("checkout" in s["name"].lower() for s in symbols)


@pytest.mark.asyncio
async def test_symbol_detail(client: AsyncClient) -> None:
    symbol_id = "billing/invoice_service.py:InvoiceService.create_invoice"
    resp = await client.get(f"/api/v1/symbols/{symbol_id}")
    assert resp.status_code == 200
    sym = resp.json()
    assert sym["id"] == symbol_id
    assert sym["module"] == "billing"
    assert "Invoice" in sym["code_snippet"]


@pytest.mark.asyncio
async def test_dependency_matrix(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/dependencies/matrix")
    assert resp.status_code == 200
    data = resp.json()
    assert "modules" in data
    assert "matrix" in data
    assert "circular_dependencies" in data


@pytest.mark.asyncio
async def test_blast_radius(client: AsyncClient) -> None:
    symbol_id = "billing/stripe_client.py:StripeClient.create_charge"
    resp = await client.get(f"/api/v1/dependencies/blast-radius/{symbol_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol_id"] == symbol_id
    assert "billing/invoice_service.py:InvoiceService.create_invoice" in data["direct_dependents"]
    assert data["impact_percentage"] >= 0


@pytest.mark.asyncio
async def test_index_scan(client: AsyncClient, tmp_path) -> None:
    # Create sample py file
    test_file = tmp_path / "sample.py"
    test_file.write_text("def hello_world(): return 'hello'", encoding="utf-8")

    resp = await client.post("/api/v1/index/scan", json={"directory_path": str(tmp_path)})
    assert resp.status_code == 200
    data = resp.json()
    assert data["scanned_files"] >= 1
    assert data["total_symbols"] > 0
