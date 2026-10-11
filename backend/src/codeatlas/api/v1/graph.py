from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from src.codeatlas.domain.entities import CodebaseGraph, SubgraphResponse
from src.codeatlas.services.graph_engine import extract_subgraph
from src.codeatlas.services.store import store

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=CodebaseGraph)
async def get_graph(
    module: Optional[str] = Query(None, description="Filter symbols by module name"),
    layer: Optional[str] = Query(None, description="Filter symbols by architectural layer"),
) -> CodebaseGraph:
    """Retrieve full or filtered codebase symbol knowledge graph."""
    if not module and not layer:
        return store.graph

    filtered_nodes = {
        nid: n
        for nid, n in store.graph.nodes.items()
        if (not module or n.module == module) and (not layer or n.layer.value == layer)
    }
    filtered_edges = [
        e
        for e in store.graph.edges
        if e.source_id in filtered_nodes and e.target_id in filtered_nodes
    ]

    return CodebaseGraph(
        project_name=store.graph.project_name,
        root_path=store.graph.root_path,
        nodes=filtered_nodes,
        edges=filtered_edges,
        modules=store.graph.modules,
        total_files=len(set(n.file_path for n in filtered_nodes.values())),
        total_symbols=len(filtered_nodes),
    )


@router.get("/subgraph/{symbol_id:path}", response_model=SubgraphResponse)
async def get_subgraph(
    symbol_id: str,
    depth: int = Query(2, ge=1, le=5, description="Depth of neighborhood traversal"),
) -> SubgraphResponse:
    """Extract k-hop dependency subgraph around a specific symbol."""
    if symbol_id not in store.graph.nodes:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol_id} not found in knowledge graph")

    return extract_subgraph(store.graph, root_id=symbol_id, max_depth=depth)
