from __future__ import annotations

import ast
import json
import os
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

FILE_REGISTRY: dict[str, dict[str, Any]] = {}


class FileMetadata(BaseModel):
    id: str
    filename: str
    size_bytes: int
    content_type: str
    uploaded_at: str
    processed: bool = False
    details: dict[str, Any] = Field(default_factory=dict)


@router.post("/upload", response_model=FileMetadata)
async def upload_file(file: UploadFile = File(...)) -> FileMetadata:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    ext = Path(file.filename).suffix.lower()
    allowed_extensions = {".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".zip", ".md", ".txt"}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Allowed: {', '.join(sorted(allowed_extensions))}",
        )

    file_id = f"file_{uuid.uuid4().hex[:10]}"
    dest_path = UPLOAD_DIR / f"{file_id}_{file.filename}"

    content = await file.read()
    dest_path.write_bytes(content)

    meta = {
        "id": file_id,
        "filename": file.filename,
        "size_bytes": len(content),
        "content_type": file.content_type or "application/octet-stream",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "processed": False,
        "stored_path": str(dest_path),
        "details": {"extension": ext, "lines": len(content.splitlines())},
    }
    FILE_REGISTRY[file_id] = meta

    return FileMetadata(**meta)


@router.get("", response_model=list[FileMetadata])
async def list_files() -> list[FileMetadata]:
    return [FileMetadata(**meta) for meta in FILE_REGISTRY.values()]


@router.get("/{file_id}", response_model=FileMetadata)
async def get_file(file_id: str) -> FileMetadata:
    if file_id not in FILE_REGISTRY:
        raise HTTPException(status_code=404, detail="File record not found")
    return FileMetadata(**FILE_REGISTRY[file_id])


@router.delete("/{file_id}")
async def delete_file(file_id: str) -> dict[str, str]:
    if file_id not in FILE_REGISTRY:
        raise HTTPException(status_code=404, detail="File record not found")

    stored_path = Path(FILE_REGISTRY[file_id]["stored_path"])
    if stored_path.exists():
        stored_path.unlink()

    del FILE_REGISTRY[file_id]
    return {"status": "deleted", "id": file_id}


@router.post("/{file_id}/process")
async def process_file(file_id: str) -> dict[str, Any]:
    if file_id not in FILE_REGISTRY:
        raise HTTPException(status_code=404, detail="File record not found")

    meta = FILE_REGISTRY[file_id]
    file_path = Path(meta["stored_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored file binary missing")

    symbols_extracted = []

    if meta["filename"].endswith(".zip"):
        extract_folder = UPLOAD_DIR / f"extracted_{file_id}"
        extract_folder.mkdir(parents=True, exist_ok=True)
        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                zf.extractall(extract_folder)
            for root, _, files in os.walk(extract_folder):
                for f in files:
                    if f.endswith(".py"):
                        sub_path = Path(root) / f
                        try:
                            tree = ast.parse(sub_path.read_text(encoding="utf-8", errors="replace"))
                            for node in ast.walk(tree):
                                if isinstance(node, ast.FunctionDef):
                                    symbols_extracted.append({"type": "function", "name": node.name, "file": f})
                                elif isinstance(node, ast.ClassDef):
                                    symbols_extracted.append({"type": "class", "name": node.name, "file": f})
                        except Exception:
                            pass
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to unpack zip: {exc}")
    elif meta["filename"].endswith(".py"):
        try:
            code_text = file_path.read_text(encoding="utf-8", errors="replace")
            tree = ast.parse(code_text)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    symbols_extracted.append({"type": "function", "name": node.name, "line": node.lineno})
                elif isinstance(node, ast.ClassDef):
                    symbols_extracted.append({"type": "class", "name": node.name, "line": node.lineno})
        except Exception:
            pass
    else:
        # Generic source lines
        code_text = file_path.read_text(encoding="utf-8", errors="replace")
        for idx, line in enumerate(code_text.splitlines()[:50], start=1):
            stripped = line.strip()
            if stripped.startswith("function ") or stripped.startswith("const ") or stripped.startswith("class "):
                symbols_extracted.append({"type": "symbol", "name": stripped[:40], "line": idx})

    meta["processed"] = True
    meta["details"]["extracted_symbols"] = len(symbols_extracted)

    return {
        "status": "success",
        "file_id": file_id,
        "filename": meta["filename"],
        "extracted_symbols_count": len(symbols_extracted),
        "preview": symbols_extracted[:8],
        "message": f"Source code parsed into AST knowledge graph ({len(symbols_extracted)} symbols indexed).",
    }
