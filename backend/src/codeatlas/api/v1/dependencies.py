from __future__ import annotations

from fastapi import APIRouter, HTTPException
from src.codeatlas.domain.entities import BlastRadiusReport, DependencyMatrix
from src.codeatlas.services.graph_engine import calculate_blast_radius, compute_dependency_matrix
from src.codeatlas.services.store import store

router = APIRouter(prefix="/dependencies", tags=["dependencies"])


@router.get("/matrix", response_model=DependencyMatrix)
async def get_dependency_matrix() -> DependencyMatrix:
    """Retrieve cross-module coupling heatmap matrix and circular dependency cycles."""
    return compute_dependency_matrix(store.graph)


@router.get("/blast-radius/{symbol_id:path}", response_model=BlastRadiusReport)
async def get_symbol_blast_radius(symbol_id: str) -> BlastRadiusReport:
    """Calculate blast radius and upstream affected dependents for a symbol."""
    if symbol_id not in store.graph.nodes:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol_id} not found")
    return calculate_blast_radius(store.graph, symbol_id)
