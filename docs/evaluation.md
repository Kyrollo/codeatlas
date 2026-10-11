# CodeAtlas Evaluation & Benchmark Harness

This document describes the reproducible evaluation methodology, metrics, and Service Level Agreement (SLA) verification for CodeAtlas.

---

## 1. Running the Benchmark

Ensure local Ollama GPU is running warm at `http://127.0.0.1:11434` with model `qwen2.5:0.5b`:

```bash
cd e:\Jobs\projects\codeatlas
python evaluation/harness/runner.py
```

Outputs generated:
- `evaluation/reports/latest_eval.json`: Raw telemetry data.
- `evaluation/reports/codebase_graph_metrics.svg`: Metric visualization card.
- `evaluation/reports/report.md`: Markdown summary.

---

## 2. Benchmark Metrics & SLA Targets

| Benchmark Phase | Target SLA | Measured Baseline | Result |
| :--- | :--- | :--- | :--- |
| **AST Parse Throughput** | > 50 files/sec | **1,366 files/sec** | PASS |
| **AST Parse Latency** | < 100 ms for 35+ files | **27.08 ms** | PASS |
| **BFS Neighborhood Extraction** | < 5 ms for k=2 | **0.055 ms** | PASS |
| **Blast Radius Reachability** | O(V + E) BFS | **< 1 ms** | PASS |
| **Local GPU Ollama RAG** | < 10,000 ms | **4,219 ms** | PASS |
| **Citation Precision** | 100% grounded lines | **100% verified** | PASS |

---

## 3. Zero-Simulation Enforcement

CodeAtlas strictly bans simulated, fake, or mock implementations. Validate at any time:

```bash
python e:\Jobs\shared\foundation\scripts\check_no_simulation.py -p e:\Jobs\projects\codeatlas
```
