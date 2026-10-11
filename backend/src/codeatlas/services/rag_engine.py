from __future__ import annotations

import re
import time
from typing import Any
import httpx
from src.codeatlas.core.config import settings
from src.codeatlas.domain.entities import (
    Citation,
    CodebaseGraph,
    RagContextNode,
    RagQueryResponse,
    SymbolNode,
)


class UpstreamOllamaError(Exception):
    """Raised when upstream Ollama inference fails."""
    pass


def retrieve_relevant_symbols(
    graph: CodebaseGraph,
    query: str,
    max_symbols: int = 6,
) -> list[tuple[SymbolNode, float]]:
    """Scores symbols based on query keyword overlap and call connectivity."""
    query_tokens = set(re.findall(r"\b\w{3,}\b", query.lower()))
    scored: list[tuple[SymbolNode, float]] = []

    for node in graph.nodes.values():
        if not node.code_snippet:
            continue

        score = 0.0
        name_lower = node.name.lower()
        path_lower = node.file_path.lower()

        # Direct name match
        for tok in query_tokens:
            if tok in name_lower:
                score += 3.0
            if tok in path_lower:
                score += 1.5
            if tok in (node.docstring or "").lower():
                score += 1.0

        # Degree bonus (centrality)
        score += min(1.0, (len(node.callers) + len(node.callees)) * 0.1)

        if score > 0.5:
            scored.append((node, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:max_symbols]


async def execute_graph_rag_query(
    graph: CodebaseGraph,
    query: str,
    model: str = "qwen2.5:0.5b",
    token_budget_max: int = 16000,
) -> RagQueryResponse:
    """
    Executes hierarchical Graph RAG query:
    1. Retrieves relevant symbols & expands neighborhood
    2. Assembles token-budgeted prompt context
    3. Queries local GPU Ollama
    4. Generates response with citations
    """
    start_time = time.perf_counter()
    candidates = retrieve_relevant_symbols(graph, query)

    # If no specific matches, pick key domain service symbols as fallbacks
    if not candidates:
        fallback_nodes = [n for n in graph.nodes.values() if n.kind in ("CLASS", "FUNCTION")][:3]
        candidates = [(n, 1.0) for n in fallback_nodes]

    assembled_nodes: list[RagContextNode] = []
    citations: list[Citation] = []
    context_blocks: list[str] = []
    total_tokens = 0

    for node, score in candidates:
        approx_tokens = max(10, len(node.code_snippet.split()) + 20)
        if total_tokens + approx_tokens > token_budget_max:
            break

        total_tokens += approx_tokens
        assembled_nodes.append(
            RagContextNode(
                symbol_id=node.id,
                name=node.name,
                kind=node.kind,
                file_path=node.file_path,
                tokens=approx_tokens,
                relevance_score=round(score, 2),
            )
        )
        citations.append(
            Citation(
                symbol_id=node.id,
                file_path=node.file_path,
                lines=f"L{node.line_start}-{node.line_end}",
                snippet_preview=node.code_snippet[:120].strip() + "...",
            )
        )
        context_blocks.append(
            f"### File: {node.file_path} | Symbol: {node.name} ({node.kind}) [L{node.line_start}-{node.line_end}]\n"
            f"```\n{node.code_snippet}\n```"
        )

    system_instruction = (
        "You are CodeAtlas, an expert software architecture and codebase AI assistant. "
        "Answer the user's question accurately using ONLY the provided code snippets and symbol context. "
        "Explicitly cite the relevant file paths and line ranges."
    )
    context_str = "\n\n".join(context_blocks)
    user_prompt = f"Codebase Context:\n{context_str}\n\nQuestion: {query}"

    url = f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 512,
    }
    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload, headers=headers)
    except httpx.RequestError as exc:
        raise UpstreamOllamaError(f"Connection failure to local Ollama GPU at {url}: {exc}") from exc

    if resp.status_code != 200:
        raise UpstreamOllamaError(f"Ollama returned HTTP {resp.status_code}: {resp.text}")

    data = resp.json()
    answer_text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return RagQueryResponse(
        query=query,
        answer=answer_text,
        model=model,
        assembled_symbols=assembled_nodes,
        token_budget_used=total_tokens,
        token_budget_max=token_budget_max,
        latency_ms=latency_ms,
        citations=citations,
    )
