from __future__ import annotations

from fastapi import APIRouter
from .health import router as health_router
from .auth import router as auth_router
from .graph import router as graph_router
from .symbols import router as symbols_router
from .dependencies import router as dependencies_router
from .rag import router as rag_router
from .index import router as index_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(graph_router)
api_v1_router.include_router(symbols_router)
api_v1_router.include_router(dependencies_router)
api_v1_router.include_router(rag_router)
api_v1_router.include_router(index_router)


@api_v1_router.get("/info", tags=["info"])
async def get_system_info() -> dict[str, str]:
    return {
        "name": "CodeAtlas",
        "slug": "codeatlas",
        "archetype": "IDE (VS Code style)",
        "version": "1.0.0",
        "description": "Codebase Knowledge Graph: native AST parsing, dependency subgraphs, blast radius impact analysis, and local GPU Graph RAG",
    }
