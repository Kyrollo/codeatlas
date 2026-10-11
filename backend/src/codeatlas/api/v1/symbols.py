from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from src.codeatlas.domain.entities import SymbolNode
from src.codeatlas.services.store import store

router = APIRouter(prefix="/symbols", tags=["symbols"])


@router.get("", response_model=list[SymbolNode])
async def list_symbols(
    q: Optional[str] = Query(None, description="Search symbol name or path"),
    module: Optional[str] = Query(None, description="Filter by module"),
    kind: Optional[str] = Query(None, description="Filter by symbol kind"),
) -> list[SymbolNode]:
    """Search and filter indexed codebase symbols."""
    symbols = list(store.graph.nodes.values())

    if module:
        symbols = [s for s in symbols if s.module == module]
    if kind:
        symbols = [s for s in symbols if s.kind.value == kind]
    if q:
        query_lower = q.lower()
        symbols = [
            s
            for s in symbols
            if query_lower in s.name.lower()
            or query_lower in s.file_path.lower()
            or (s.docstring and query_lower in s.docstring.lower())
        ]

    return symbols


@router.get("/{symbol_id:path}", response_model=SymbolNode)
async def get_symbol(symbol_id: str) -> SymbolNode:
    """Retrieve detailed symbol definition with syntax snippet and complexity metrics."""
    symbol = store.graph.nodes.get(symbol_id)
    if not symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol_id} not found")
    return symbol
