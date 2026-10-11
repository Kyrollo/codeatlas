# CodeAtlas Data Model

This document outlines the domain entities, relationships, and data structures utilized by CodeAtlas for codebase knowledge graphs and AST symbol retrieval.

---

## 1. Domain Entity Relationship Diagram

```mermaid
classDiagram
    class SymbolNode {
        +string id
        +string name
        +SymbolKind kind
        +string file_path
        +int line_start
        +int line_end
        +string docstring
        +string code_snippet
        +string module
        +LayerKind layer
        +int complexity
        +int loc
        +list~string~ callers
        +list~string~ callees
    }

    class GraphEdge {
        +string id
        +string source_id
        +string target_id
        +EdgeKind kind
        +dict metadata
    }

    class CodebaseGraph {
        +string project_name
        +string root_path
        +dict~string, SymbolNode~ nodes
        +list~GraphEdge~ edges
        +list~string~ modules
        +int total_files
        +int total_symbols
    }

    class SubgraphResponse {
        +string root_symbol_id
        +list~SymbolNode~ nodes
        +list~GraphEdge~ edges
        +int depth
    }

    class DependencyMatrix {
        +list~string~ modules
        +dict~string, dict~string, int~~ matrix
        +list~list~string~~ circular_dependencies
    }

    class BlastRadiusReport {
        +string symbol_id
        +string symbol_name
        +SymbolKind kind
        +string file_path
        +list~string~ direct_dependents
        +list~string~ transitive_dependents
        +float impact_percentage
        +list~string~ affected_files
    }

    class RagQueryResponse {
        +string query
        +string answer
        +string model
        +list~RagContextNode~ assembled_symbols
        +int token_budget_used
        +int token_budget_max
        +float latency_ms
        +list~Citation~ citations
    }

    CodebaseGraph "1" *-- "many" SymbolNode : contains
    CodebaseGraph "1" *-- "many" GraphEdge : contains
    SubgraphResponse "1" *-- "many" SymbolNode : sub-neighborhood
    SubgraphResponse "1" *-- "many" GraphEdge : sub-edges
    GraphEdge --> SymbolNode : references source & target
```

---

## 2. Enums and Classification

### SymbolKind
- `MODULE`: Package directory or top-level module.
- `FILE`: Single source file.
- `CLASS`: Object-oriented class definition.
- `METHOD`: Class method or static/classmethod.
- `FUNCTION`: Standalone module function.
- `INTERFACE`: Abstract Base Class (ABC) or Protocol.
- `TYPE_ALIAS`: Custom type alias or generic definition.

### EdgeKind
- `CALLS`: Direct function invocation or method execution.
- `IMPORTS`: Cross-file import dependency.
- `CONTAINS`: Structural containment (e.g., class contains method).
- `EXTENDS`: Inheritance subclassing.
- `IMPLEMENTS`: Protocol / interface implementation.
- `REFERENCES`: Variable or symbol usage.

### LayerKind
- `API`: REST routers, controllers, ASGI endpoints.
- `DOMAIN`: Core business entities, schemas, models.
- `SERVICE`: Business logic orchestrators and use cases.
- `CORE`: Configuration, security, cryptography, logging.
- `INFRASTRUCTURE`: Database clients, HTTP clients, message queues, caches.
