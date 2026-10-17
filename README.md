# CodeAtlas

> **Deep semantic understanding and architectural navigation for complex codebases**

[![CI](https://github.com/Kyrollo/codeatlas/actions/workflows/ci.yml/badge.svg)](https://github.com/Kyrollo/codeatlas/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A580%25-brightgreen.svg)](tests/)

Codebase Intelligence Platform: hybrid AST/semantic code search, interactive repository Q&A, and auto-generated architecture wikis

---


## 🎬 Live Demonstration & Real Interface

[![Watch Video Demo](docs/assets/screenshots/01_hero_dashboard.png)](docs/assets/demo.mp4)

> 📹 **High-Definition 1080p MP4 Demo Recording**: [`docs/assets/demo.mp4`](docs/assets/demo.mp4)

### 📸 Visual Feature Gallery

| 1. System Overview & Dashboard | 2. Studio / Interactive Workbench |
|:---:|:---:|
| ![Dashboard](docs/assets/screenshots/01_hero_dashboard.png) | ![Workbench](docs/assets/screenshots/02_workbench_studio.png) |
| **3. Analysis Results & Diagnostics** | **4. Telemetry, Metrics & Upload** |
| ![Results](docs/assets/screenshots/03_analysis_results.png) | ![Telemetry](docs/assets/screenshots/04_telemetry_metrics.png) |

---

## Architecture Overview

```mermaid
flowchart TD
    Client["Client / Browser"] -->|"HTTP / SSE"| Web["Frontend (React 19 + Tailwind v4)\nPort 3004"]
    Web -->|"REST API /v1"| API["FastAPI Backend\nPort 8004"]
    API -->|"Async ORM"| DB[("PostgreSQL 16")]
    API -->|"Tasks / Cache"| Redis[("Redis 7")]
    API -->|"Async Celery Worker"| Worker["Worker Process"]
    API -->|"Provider-Agnostic HTTP"| LLM["LLM Provider (Ollama / Cloud)"]
    API -->|"Telemetry & Spans"| Observability["OpenTelemetry + Langfuse + Prometheus"]
```

## Quickstart

### ⚡ 1-Click Launch (Windows Standalone)

Run the included standalone launcher to boot all services and launch the browser immediately:

```bat
.\run.bat
```


### Prerequisites
- Docker & Docker Compose OR Python 3.12+ & Node 22+
- Local Ollama running (`ollama serve`) or cloud LLM API key

### Running with Docker Compose
```bash
# 1. Clone repository
git clone https://github.com/Kyrollo/codeatlas.git
cd codeatlas

# 2. Configure environment
cp .env.example .env

# 3. Start complete stack (Database, Redis, API, Frontend)
docker compose -f deploy/compose.dev.yml up --build
```

Access services:
- **Web Console**: [http://localhost:3004](http://localhost:3004)
- **Backend API**: [http://localhost:8004](http://localhost:8004)
- **API Documentation**: [http://localhost:8004/docs](http://localhost:8004/docs)
- **Metrics**: [http://localhost:8004/metrics](http://localhost:8004/metrics)

---

## Repository Structure

```text
codeatlas/
├── backend/            # FastAPI async backend, domain logic, AI pipelines
├── frontend/           # React 19 + Vite + Tailwind CSS v4 frontend
├── evaluation/         # Reproducible evaluation harness and benchmarks
├── docs/               # Complete MkDocs Material technical documentation
├── deploy/             # Docker Compose configurations (dev, prod, gpu)
├── scripts/            # CI validation, smoke tests, utility scripts
└── .github/workflows/  # CI/CD pipelines
```

## License
MIT License. See [LICENSE](LICENSE) for details.
