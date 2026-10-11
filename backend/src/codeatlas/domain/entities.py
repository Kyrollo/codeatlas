from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class SymbolKind(str, Enum):
    MODULE = "MODULE"
    FILE = "FILE"
    CLASS = "CLASS"
    FUNCTION = "FUNCTION"
    METHOD = "METHOD"
    INTERFACE = "INTERFACE"
    TYPE_ALIAS = "TYPE_ALIAS"


class EdgeKind(str, Enum):
    CONTAINS = "CONTAINS"
    CALLS = "CALLS"
    IMPORTS = "IMPORTS"
    IMPLEMENTS = "IMPLEMENTS"
    EXTENDS = "EXTENDS"
    REFERENCES = "REFERENCES"


class LayerKind(str, Enum):
    API = "API"
    DOMAIN = "DOMAIN"
    SERVICE = "SERVICE"
    CORE = "CORE"
    INFRASTRUCTURE = "INFRASTRUCTURE"


class SymbolNode(BaseModel):
    id: str  # e.g. "services/user_service.py:authenticate_user"
    name: str
    kind: SymbolKind
    file_path: str
    line_start: int
    line_end: int
    docstring: str | None = None
    code_snippet: str = ""
    module: str
    layer: LayerKind
    complexity: int = 1
    loc: int = 1
    callers: list[str] = Field(default_factory=list)
    callees: list[str] = Field(default_factory=list)


class GraphEdge(BaseModel):
    id: str
    source_id: str
    target_id: str
    kind: EdgeKind
    metadata: dict[str, Any] = Field(default_factory=dict)


class CodebaseGraph(BaseModel):
    project_name: str
    root_path: str
    nodes: dict[str, SymbolNode] = Field(default_factory=dict)
    edges: list[GraphEdge] = Field(default_factory=list)
    modules: list[str] = Field(default_factory=list)
    total_files: int = 0
    total_symbols: int = 0


class SubgraphResponse(BaseModel):
    root_symbol_id: str
    nodes: list[SymbolNode]
    edges: list[GraphEdge]
    depth: int


class DependencyMatrix(BaseModel):
    modules: list[str]
    matrix: dict[str, dict[str, int]]  # module_from -> module_to -> count
    circular_dependencies: list[list[str]] = Field(default_factory=list)


class BlastRadiusReport(BaseModel):
    symbol_id: str
    symbol_name: str
    kind: SymbolKind
    file_path: str
    direct_dependents: list[str] = Field(default_factory=list)
    transitive_dependents: list[str] = Field(default_factory=list)
    impact_percentage: float = 0.0
    affected_files: list[str] = Field(default_factory=list)


class RagContextNode(BaseModel):
    symbol_id: str
    name: str
    kind: SymbolKind
    file_path: str
    tokens: int
    relevance_score: float


class Citation(BaseModel):
    symbol_id: str
    file_path: str
    lines: str
    snippet_preview: str


class RagQueryResponse(BaseModel):
    query: str
    answer: str
    model: str
    assembled_symbols: list[RagContextNode] = Field(default_factory=list)
    token_budget_used: int
    token_budget_max: int
    latency_ms: float
    citations: list[Citation] = Field(default_factory=list)
