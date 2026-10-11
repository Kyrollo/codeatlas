from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from src.codeatlas.domain.entities import RagQueryResponse
from src.codeatlas.services.rag_engine import UpstreamOllamaError, execute_graph_rag_query
from src.codeatlas.services.store import store

router = APIRouter(prefix="/rag", tags=["rag"])


class RagQueryRequest(BaseModel):
    query: str
    model: str = "qwen2.5:0.5b"
    token_budget_max: int = 16000


@router.post("/query", response_model=RagQueryResponse)
async def query_codebase_graph(req: RagQueryRequest) -> RagQueryResponse:
    """
    Execute Graph RAG query across codebase knowledge graph.
    Assembles dependency subgraph context and generates answer with grounded citations.
    """
    try:
        resp = await execute_graph_rag_query(
            store.graph,
            query=req.query,
            model=req.model,
            token_budget_max=req.token_budget_max,
        )
        store.query_history.insert(
            0,
            {
                "query": req.query,
                "symbols_count": len(resp.assembled_symbols),
                "tokens_used": resp.token_budget_used,
                "latency_ms": resp.latency_ms,
            },
        )
        return resp
    except UpstreamOllamaError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "type": "https://codeatlas.dev/errors/upstream-unavailable",
                "title": "Local GPU LLM Engine Unavailable",
                "status": 503,
                "detail": str(exc),
            },
        )
