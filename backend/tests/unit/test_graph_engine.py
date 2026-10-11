from __future__ import annotations

from src.codeatlas.domain.entities import (
    CodebaseGraph,
    EdgeKind,
    GraphEdge,
    LayerKind,
    SymbolKind,
    SymbolNode,
)
from src.codeatlas.services.graph_engine import (
    calculate_blast_radius,
    compute_dependency_matrix,
    extract_subgraph,
)


def _make_sample_graph() -> CodebaseGraph:
    nodes = {
        "A": SymbolNode(
            id="A",
            name="NodeA",
            kind=SymbolKind.FUNCTION,
            file_path="mod_a/a.py",
            line_start=1,
            line_end=10,
            module="mod_a",
            layer=LayerKind.API,
            complexity=1,
            loc=10,
            callers=[],
            callees=["B"],
        ),
        "B": SymbolNode(
            id="B",
            name="NodeB",
            kind=SymbolKind.CLASS,
            file_path="mod_b/b.py",
            line_start=1,
            line_end=20,
            module="mod_b",
            layer=LayerKind.SERVICE,
            complexity=2,
            loc=20,
            callers=["A"],
            callees=["C"],
        ),
        "C": SymbolNode(
            id="C",
            name="NodeC",
            kind=SymbolKind.FUNCTION,
            file_path="mod_c/c.py",
            line_start=1,
            line_end=15,
            module="mod_c",
            layer=LayerKind.DOMAIN,
            complexity=1,
            loc=15,
            callers=["B"],
            callees=[],
        ),
        "D": SymbolNode(
            id="D",
            name="NodeD",
            kind=SymbolKind.FUNCTION,
            file_path="mod_a/d.py",
            line_start=1,
            line_end=15,
            module="mod_a",
            layer=LayerKind.API,
            complexity=1,
            loc=15,
            callers=["C"],
            callees=[],
        ),
    }

    edges = [
        GraphEdge(id="e1", source_id="A", target_id="B", kind=EdgeKind.CALLS),
        GraphEdge(id="e2", source_id="B", target_id="C", kind=EdgeKind.CALLS),
        GraphEdge(id="e3", source_id="C", target_id="D", kind=EdgeKind.CALLS),
        GraphEdge(id="e4", source_id="B", target_id="A", kind=EdgeKind.CALLS),  # Creates cycle mod_a <-> mod_b
    ]

    return CodebaseGraph(
        project_name="TestProject",
        root_path="src/",
        nodes=nodes,
        edges=edges,
        modules=["mod_a", "mod_b", "mod_c"],
        total_files=4,
        total_symbols=4,
    )


def test_extract_subgraph() -> None:
    graph = _make_sample_graph()
    subgraph = extract_subgraph(graph, root_id="A", max_depth=1)

    assert subgraph.root_symbol_id == "A"
    node_ids = {n.id for n in subgraph.nodes}
    assert "A" in node_ids
    assert "B" in node_ids


def test_calculate_blast_radius() -> None:
    graph = _make_sample_graph()
    report = calculate_blast_radius(graph, symbol_id="C")

    assert report.symbol_id == "C"
    assert "B" in report.direct_dependents
    assert "A" in report.transitive_dependents
    assert report.impact_percentage > 0


def test_compute_dependency_matrix_and_cycle_detection() -> None:
    graph = _make_sample_graph()
    matrix = compute_dependency_matrix(graph)

    assert "mod_a" in matrix.modules
    assert "mod_b" in matrix.modules
    assert "mod_c" in matrix.modules

    assert matrix.matrix["mod_a"]["mod_b"] >= 1
    assert matrix.matrix["mod_b"]["mod_a"] >= 1
    assert len(matrix.circular_dependencies) > 0
