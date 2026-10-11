# CodeAtlas REST API Reference

The CodeAtlas API runs on port 8004 (or configured port) under prefix `/api/v1`.

---

## Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/info` | Service metadata, architecture archetype, and version. |
| `GET` | `/api/v1/readyz` | Liveness and dependency readiness probes. |
| `GET` | `/api/v1/graph` | Retrieve entire or filtered codebase knowledge graph. |
| `GET` | `/api/v1/graph/subgraph/{id}` | Extract k-hop dependency neighborhood around a root symbol. |
| `GET` | `/api/v1/symbols` | Search and filter indexed symbols by keyword, module, or kind. |
| `GET` | `/api/v1/symbols/{id}` | Retrieve detailed symbol AST metadata, snippet, and complexity. |
| `GET` | `/api/v1/dependencies/matrix` | Cross-module coupling heatmap matrix and circular cycles. |
| `GET` | `/api/v1/dependencies/blast-radius/{id}` | Compute blast radius impact and upstream reachable callers. |
| `POST` | `/api/v1/rag/query` | Execute Graph RAG query with live local GPU Ollama inference. |
| `POST` | `/api/v1/index/scan` | Scan and index a local directory tree on disk using AST parser. |

---

## Detailed Endpoint Specifications

### 1. `POST /api/v1/rag/query`
Executes Graph RAG search across indexed codebase symbols, assembling token-budgeted prompt context and generating an answer using local GPU Ollama (`qwen2.5:0.5b`).

**Request Body:**
```json
{
  "query": "How does checkout orchestrate Stripe charging and inventory reservation?",
  "model": "qwen2.5:0.5b",
  "token_budget_max": 16000
}
```

**Response (HTTP 200 OK):**
```json
{
  "query": "How does checkout orchestrate Stripe charging and inventory reservation?",
  "answer": "The checkout workflow is handled by OrderProcessor.checkout in orders/order_processor.py...",
  "model": "qwen2.5:0.5b",
  "assembled_symbols": [
    {
      "symbol_id": "orders/order_processor.py:OrderProcessor.checkout",
      "name": "OrderProcessor.checkout",
      "kind": "METHOD",
      "file_path": "orders/order_processor.py",
      "tokens": 78,
      "relevance_score": 4.2
    }
  ],
  "token_budget_used": 312,
  "token_budget_max": 16000,
  "latency_ms": 4219.4,
  "citations": [
    {
      "symbol_id": "orders/order_processor.py:OrderProcessor.checkout",
      "file_path": "orders/order_processor.py",
      "lines": "L40-L95",
      "snippet_preview": "async def checkout(self, cart_id: str, user_id: str)..."
    }
  ]
}
```

**Error Response (HTTP 503 Service Unavailable — RFC 7807):**
```json
{
  "type": "https://codeatlas.dev/errors/upstream-unavailable",
  "title": "Local GPU LLM Engine Unavailable",
  "status": 503,
  "detail": "Connection failure to local Ollama GPU at http://127.0.0.1:11434/chat/completions"
}
```

---

### 2. `GET /api/v1/dependencies/blast-radius/{symbol_id}`
Calculates reachable callers and ripple impact if the target symbol undergoes refactoring or breaking signature changes.

**Response (HTTP 200 OK):**
```json
{
  "symbol_id": "billing/stripe_client.py:StripeClient.create_charge",
  "symbol_name": "StripeClient.create_charge",
  "kind": "METHOD",
  "file_path": "billing/stripe_client.py",
  "direct_dependents": [
    "billing/invoice_service.py:InvoiceService.create_invoice"
  ],
  "transitive_dependents": [
    "api/routes.py:checkout_endpoint",
    "billing/invoice_service.py:InvoiceService.create_invoice",
    "orders/order_processor.py:OrderProcessor.checkout"
  ],
  "impact_percentage": 33.3,
  "affected_files": [
    "api/routes.py",
    "billing/invoice_service.py",
    "orders/order_processor.py"
  ]
}
```
