from __future__ import annotations

import pytest
from src.codeatlas.domain.entities import LayerKind, SymbolKind, SymbolNode, CodebaseGraph
from src.codeatlas.services.rag_engine import retrieve_relevant_symbols


def test_retrieve_relevant_symbols() -> None:
    nodes = {
        "auth/token.py:verify_token": SymbolNode(
            id="auth/token.py:verify_token",
            name="verify_token",
            kind=SymbolKind.FUNCTION,
            file_path="auth/token.py",
            line_start=10,
            line_end=25,
            docstring="Verifies JWT authentication bearer token.",
            code_snippet="def verify_token(token): return True",
            module="auth",
            layer=LayerKind.CORE,
            callers=["api/routes.py:login"],
            callees=[],
        ),
        "billing/stripe.py:charge": SymbolNode(
            id="billing/stripe.py:charge",
            name="charge_card",
            kind=SymbolKind.FUNCTION,
            file_path="billing/stripe.py",
            line_start=1,
            line_end=20,
            docstring="Processes credit card transaction.",
            code_snippet="def charge_card(amount): return 200",
            module="billing",
            layer=LayerKind.SERVICE,
            callers=[],
            callees=[],
        ),
    }

    graph = CodebaseGraph(
        project_name="TestApp",
        root_path="src/",
        nodes=nodes,
        edges=[],
        modules=["auth", "billing"],
        total_files=2,
        total_symbols=2,
    )

    # Search for token
    retrieved = retrieve_relevant_symbols(graph, "How does the system verify JWT tokens?")
    assert len(retrieved) >= 1
    top_symbol, score = retrieved[0]
    assert top_symbol.id == "auth/token.py:verify_token"
    assert score > 0
