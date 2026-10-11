from __future__ import annotations

from collections import defaultdict, deque
from typing import Dict, List, Set
from src.codeatlas.domain.entities import (
    BlastRadiusReport,
    CodebaseGraph,
    DependencyMatrix,
    EdgeKind,
    GraphEdge,
    SubgraphResponse,
    SymbolNode,
)


def extract_subgraph(graph: CodebaseGraph, root_id: str, max_depth: int = 2) -> SubgraphResponse:
    """Extracts k-hop dependency neighborhood around a root symbol."""
    if root_id not in graph.nodes:
        return SubgraphResponse(root_symbol_id=root_id, nodes=[], edges=[], depth=max_depth)

    visited_nodes: Set[str] = {root_id}
    visited_edges: List[GraphEdge] = []
    queue: deque[tuple[str, int]] = deque([(root_id, 0)])

    # Build adjacency lists
    adj: Dict[str, List[GraphEdge]] = defaultdict(list)
    for edge in graph.edges:
        adj[edge.source_id].append(edge)
        adj[edge.target_id].append(edge)

    while queue:
        curr_id, depth = queue.popleft()
        if depth >= max_depth:
            continue

        for edge in adj.get(curr_id, []):
            if edge not in visited_edges:
                visited_edges.append(edge)

            neighbor_id = edge.target_id if edge.source_id == curr_id else edge.source_id
            if neighbor_id in graph.nodes and neighbor_id not in visited_nodes:
                visited_nodes.add(neighbor_id)
                queue.append((neighbor_id, depth + 1))

    nodes = [graph.nodes[nid] for nid in visited_nodes if nid in graph.nodes]
    return SubgraphResponse(
        root_symbol_id=root_id,
        nodes=nodes,
        edges=visited_edges,
        depth=max_depth,
    )


def calculate_blast_radius(graph: CodebaseGraph, symbol_id: str) -> BlastRadiusReport:
    """
    Computes reachable callers and dependent symbols if the target symbol changes.
    """
    target_node = graph.nodes.get(symbol_id)
    if not target_node:
        return BlastRadiusReport(
            symbol_id=symbol_id,
            symbol_name=symbol_id,
            kind=SymbolNode.kind,
            file_path="",
        )

    # Invert edges: who calls or imports this symbol?
    callers_adj: Dict[str, List[str]] = defaultdict(list)
    for edge in graph.edges:
        if edge.kind in (EdgeKind.CALLS, EdgeKind.IMPORTS, EdgeKind.REFERENCES):
            callers_adj[edge.target_id].append(edge.source_id)

    direct_callers = set(callers_adj.get(symbol_id, []))
    all_dependents: Set[str] = set()
    queue = deque(direct_callers)

    while queue:
        curr = queue.popleft()
        if curr not in all_dependents:
            all_dependents.add(curr)
            for upstream in callers_adj.get(curr, []):
                if upstream not in all_dependents:
                    queue.append(upstream)

    total_symbols = max(1, len(graph.nodes))
    impact_pct = round((len(all_dependents) / total_symbols) * 100.0, 1)

    affected_files = sorted(
        list(
            {
                graph.nodes[d].file_path
                for d in all_dependents
                if d in graph.nodes and graph.nodes[d].file_path
            }
        )
    )

    return BlastRadiusReport(
        symbol_id=symbol_id,
        symbol_name=target_node.name,
        kind=target_node.kind,
        file_path=target_node.file_path,
        direct_dependents=sorted(list(direct_callers)),
        transitive_dependents=sorted(list(all_dependents)),
        impact_percentage=impact_pct,
        affected_files=affected_files,
    )


def compute_dependency_matrix(graph: CodebaseGraph) -> DependencyMatrix:
    """
    Calculates cross-module coupling matrix and detects circular dependencies.
    """
    modules = sorted(list(set(n.module for n in graph.nodes.values() if n.module)))
    matrix: Dict[str, Dict[str, int]] = {m: {m2: 0 for m2 in modules} for m in modules}

    for edge in graph.edges:
        src = graph.nodes.get(edge.source_id)
        tgt = graph.nodes.get(edge.target_id)
        if src and tgt and src.module != tgt.module and src.module in matrix and tgt.module in matrix[src.module]:
            matrix[src.module][tgt.module] += 1

    # Cycle Detection between modules
    cycles: List[List[str]] = []
    for m1 in modules:
        for m2 in modules:
            if m1 != m2 and matrix[m1][m2] > 0 and matrix[m2][m1] > 0:
                pair = sorted([m1, m2])
                if pair not in cycles:
                    cycles.append(pair)

    return DependencyMatrix(
        modules=modules,
        matrix=matrix,
        circular_dependencies=cycles,
    )
