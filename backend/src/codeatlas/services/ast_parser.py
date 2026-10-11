from __future__ import annotations

import ast
import re
from pathlib import Path
from src.codeatlas.domain.entities import EdgeKind, GraphEdge, LayerKind, SymbolKind, SymbolNode


def infer_layer(file_path: str) -> LayerKind:
    """Infer architectural layer from file path."""
    lower = file_path.lower()
    if "api" in lower or "routes" in lower or "endpoints" in lower or "controller" in lower:
        return LayerKind.API
    if "domain" in lower or "models" in lower or "entities" in lower:
        return LayerKind.DOMAIN
    if "services" in lower or "handlers" in lower or "use_cases" in lower:
        return LayerKind.SERVICE
    if "core" in lower or "config" in lower or "security" in lower:
        return LayerKind.CORE
    return LayerKind.INFRASTRUCTURE


def compute_cyclomatic_complexity(node: ast.AST) -> int:
    """Estimate cyclomatic complexity for an AST function/class node."""
    complexity = 1
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor, ast.ExceptHandler, ast.With, ast.AsyncWith)):
            complexity += 1
        elif isinstance(child, ast.BoolOp):
            complexity += len(child.values) - 1
    return complexity


def parse_python_file(file_path: str, source_code: str) -> tuple[list[SymbolNode], list[GraphEdge]]:
    """
    Parses Python source code into symbol nodes and dependency edges using native AST.
    """
    symbols: list[SymbolNode] = []
    edges: list[GraphEdge] = []
    module_name = Path(file_path).parts[0] if Path(file_path).parts else "root"
    layer = infer_layer(file_path)

    try:
        tree = ast.parse(source_code, filename=file_path)
    except SyntaxError:
        return symbols, edges

    lines = source_code.splitlines()

    # Track file-level module node
    file_id = f"{file_path}:file"
    file_symbol = SymbolNode(
        id=file_id,
        name=Path(file_path).name,
        kind=SymbolKind.FILE,
        file_path=file_path,
        line_start=1,
        line_end=len(lines),
        docstring=ast.get_docstring(tree),
        code_snippet="\n".join(lines[:20]) + ("..." if len(lines) > 20 else ""),
        module=module_name,
        layer=layer,
        complexity=1,
        loc=len(lines),
    )
    symbols.append(file_symbol)

    # 1. Imports
    for node in tree.body:
        if isinstance(node, ast.Import):
            for alias in node.names:
                edges.append(
                    GraphEdge(
                        id=f"{file_id}->{alias.name}:IMPORTS",
                        source_id=file_id,
                        target_id=alias.name,
                        kind=EdgeKind.IMPORTS,
                    )
                )
        elif isinstance(node, ast.ImportFrom) and node.module:
            edges.append(
                GraphEdge(
                    id=f"{file_id}->{node.module}:IMPORTS",
                    source_id=file_id,
                    target_id=node.module,
                    kind=EdgeKind.IMPORTS,
                )
            )

    # 2. Classes & Functions
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            class_id = f"{file_path}:{node.name}"
            class_snippet = "\n".join(lines[node.lineno - 1 : min(node.end_lineno or node.lineno + 20, len(lines))])
            class_node = SymbolNode(
                id=class_id,
                name=node.name,
                kind=SymbolKind.CLASS,
                file_path=file_path,
                line_start=node.lineno,
                line_end=node.end_lineno or node.lineno,
                docstring=ast.get_docstring(node),
                code_snippet=class_snippet,
                module=module_name,
                layer=layer,
                complexity=compute_cyclomatic_complexity(node),
                loc=(node.end_lineno or node.lineno) - node.lineno + 1,
            )
            symbols.append(class_node)
            edges.append(
                GraphEdge(
                    id=f"{file_id}->{class_id}:CONTAINS",
                    source_id=file_id,
                    target_id=class_id,
                    kind=EdgeKind.CONTAINS,
                )
            )

            # Class Methods
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    method_id = f"{file_path}:{node.name}.{item.name}"
                    method_snippet = "\n".join(lines[item.lineno - 1 : item.end_lineno or item.lineno])
                    method_node = SymbolNode(
                        id=method_id,
                        name=f"{node.name}.{item.name}",
                        kind=SymbolKind.METHOD,
                        file_path=file_path,
                        line_start=item.lineno,
                        line_end=item.end_lineno or item.lineno,
                        docstring=ast.get_docstring(item),
                        code_snippet=method_snippet,
                        module=module_name,
                        layer=layer,
                        complexity=compute_cyclomatic_complexity(item),
                        loc=(item.end_lineno or item.lineno) - item.lineno + 1,
                    )
                    symbols.append(method_node)
                    edges.append(
                        GraphEdge(
                            id=f"{class_id}->{method_id}:CONTAINS",
                            source_id=class_id,
                            target_id=method_id,
                            kind=EdgeKind.CONTAINS,
                        )
                    )

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_id = f"{file_path}:{node.name}"
            func_snippet = "\n".join(lines[node.lineno - 1 : node.end_lineno or node.lineno])
            callees = []
            for sub in ast.walk(node):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name):
                    callees.append(sub.func.id)

            func_node = SymbolNode(
                id=func_id,
                name=node.name,
                kind=SymbolKind.FUNCTION,
                file_path=file_path,
                line_start=node.lineno,
                line_end=node.end_lineno or node.lineno,
                docstring=ast.get_docstring(node),
                code_snippet=func_snippet,
                module=module_name,
                layer=layer,
                complexity=compute_cyclomatic_complexity(node),
                loc=(node.end_lineno or node.lineno) - node.lineno + 1,
                callees=list(set(callees)),
            )
            symbols.append(func_node)
            edges.append(
                GraphEdge(
                    id=f"{file_id}->{func_id}:CONTAINS",
                    source_id=file_id,
                    target_id=func_id,
                    kind=EdgeKind.CONTAINS,
                )
            )

    return symbols, edges
