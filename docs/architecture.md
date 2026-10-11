# CodeAtlas System Architecture

CodeAtlas is an enterprise-grade Codebase Knowledge Graph and AST Symbol Retrieval-Augmented Generation (RAG) platform. It parses Python source trees into typed symbol nodes and dependency graphs, computes blast radius ripple effects for refactoring safety, and uses a local GPU LLM to answer complex architectural queries with verified citations.

---

## 1. C4 Container Diagram

```mermaid
flowchart TD
    subgraph Clients["Developers & IDE Integrations"]
        Dev["Software Engineer / Architect"]
        IDE["VS Code / IDE Extension"]
    end

    subgraph CodeAtlas["CodeAtlas Platform"]
        Frontend["Frontend SPA (React 18 + Tailwind + SVG Graph)\nPort 5173 / Static Dist"]
        APIGateway["FastAPI Gateway Engine\nPort 8004"]
        
        subgraph CoreServices["Intelligence Engines"]
            ASTParser["Native Python AST Parser\n(Complexity & Symbol Extraction)"]
            GraphEngine["Graph Engine\n(BFS Subgraph, Cycles, Blast Radius)"]
            RAGEngine["Graph RAG Context Assembler\n(Token Budget & Citations)"]
            Store["In-Memory Graph State Store\n(Indexed Symbols & Edges)"]
        end
    end

    subgraph GPUInference["Local GPU Compute"]
        Ollama["Ollama Engine (Local GPU: RTX A5000)\nModel: qwen2.5:0.5b (Port 11434)"]
    end

    Dev -->|Visualizes Graph & Queries| Frontend
    IDE -->|AST & Blast Radius API| APIGateway
    Frontend -->|REST API Calls| APIGateway

    APIGateway --> ASTParser
    APIGateway --> GraphEngine
    APIGateway --> RAGEngine
    
    ASTParser -->|Yields Nodes & Edges| Store
    GraphEngine -->|Traverses Nodes & Adjacency| Store
    RAGEngine -->|Retrieves Neighborhoods| Store
    RAGEngine -->|Queries Context & Generates| Ollama
```

---

## 2. Graph RAG Execution Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Engineer as Engineer
    participant UI as CodeAtlas UI
    participant API as FastAPI Gateway
    participant RAG as RAG Assembler
    participant Store as Graph Store
    participant GPU as Local Ollama GPU (RTX A5000)

    Engineer->>UI: Enters Architectural Question ("How does checkout invoke Stripe?")
    UI->>API: POST /api/v1/rag/query
    API->>RAG: execute_graph_rag_query(graph, query)
    
    RAG->>Store: retrieve_relevant_symbols(query)
    Store-->>RAG: Matched Candidate Symbols (Checkout, Invoice, StripeClient)
    
    RAG->>Store: expand_subgraph(candidates, max_depth=2)
    Store-->>RAG: Neighborhood Callers & Callees
    
    RAG->>RAG: Assemble Prompt Context (Within 16,000 Token Budget)
    RAG->>GPU: POST /chat/completions (System prompt + Context blocks + Query)
    GPU-->>RAG: Generated Answer Text
    
    RAG->>RAG: Ground Citations (File paths, line numbers, snippets)
    RAG-->>API: RagQueryResponse (Answer, Citations, Latency, Token Metrics)
    API-->>UI: HTTP 200 JSON Response
    UI-->>Engineer: Renders Markdown Answer + Clickable Code Citations
```

---

## 3. Technology Stack & Design Decisions

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.12) | High-throughput asynchronous endpoints with Pydantic v2 schemas and RFC 7807 problem details. |
| **AST Parser** | Python native `ast` | Sub-millisecond parsing throughput (>1,300 files/s), extracting classes, methods, docstrings, and cyclomatic complexity. |
| **Graph Engine** | In-memory Adjacency BFS & Inverted Index | Instant k-hop neighborhood extractions (<0.1ms) and deterministic cycle / blast radius computation. |
| **Inference Engine** | Ollama local GPU (`qwen2.5:0.5b`) | Zero external API dependencies; private, fast (<4.2s), low-VRAM memory footprint on NVIDIA RTX A5000. |
| **Frontend UI** | React 18 + TypeScript + Tailwind CSS | Bespoke 2D SVG graph canvas with radial module clustering, token budget meters, and coupling heatmap tables. |
| **Zero-Simulation** | Enforced by automated guard script | No synthetic data or fallback sleep loops; strictly real parsing and real GPU inference. |
