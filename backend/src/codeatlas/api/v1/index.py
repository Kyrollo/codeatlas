from __future__ import annotations

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.codeatlas.services.store import store

router = APIRouter(prefix="/index", tags=["indexing"])


class ScanRequest(BaseModel):
    directory_path: str


class ScanResponse(BaseModel):
    scanned_files: int
    total_files: int
    total_symbols: int
    directory_path: str


@router.post("/scan", response_model=ScanResponse)
async def scan_repository(req: ScanRequest) -> ScanResponse:
    """Scan and index a repository directory using AST symbol parser."""
    if not os.path.exists(req.directory_path):
        raise HTTPException(
            status_code=400,
            detail=f"Directory path does not exist on host: {req.directory_path}",
        )

    scanned = store.scan_and_index_path(req.directory_path)
    return ScanResponse(
        scanned_files=scanned,
        total_files=store.graph.total_files,
        total_symbols=store.graph.total_symbols,
        directory_path=req.directory_path,
    )
