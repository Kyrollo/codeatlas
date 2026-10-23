import {
  BlastRadiusReport,
  CodebaseGraph,
  DependencyMatrix,
  RagQueryResponse,
  ScanResponse,
  SubgraphResponse,
  SymbolNode,
} from '../types/codeatlas';

const API_BASE = '/api/v1';

export async function fetchGraph(module?: string, layer?: string): Promise<CodebaseGraph> {
  const params = new URLSearchParams();
  if (module) params.append('module', module);
  if (layer) params.append('layer', layer);
  const url = `${API_BASE}/graph${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch codebase graph: ${res.statusText}`);
  return res.json();
}

export async function fetchSubgraph(symbolId: string, depth: number = 2): Promise<SubgraphResponse> {
  const encodedId = encodeURIComponent(symbolId);
  const res = await fetch(`${API_BASE}/graph/subgraph/${encodedId}?depth=${depth}`);
  if (!res.ok) throw new Error(`Failed to fetch subgraph for ${symbolId}: ${res.statusText}`);
  return res.json();
}

export async function searchSymbols(
  query?: string,
  module?: string,
  kind?: string
): Promise<SymbolNode[]> {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (module) params.append('module', module);
  if (kind) params.append('kind', kind);
  const url = `${API_BASE}/symbols${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to query symbols: ${res.statusText}`);
  return res.json();
}

export async function fetchSymbol(symbolId: string): Promise<SymbolNode> {
  const encodedId = encodeURIComponent(symbolId);
  const res = await fetch(`${API_BASE}/symbols/${encodedId}`);
  if (!res.ok) throw new Error(`Failed to fetch symbol ${symbolId}: ${res.statusText}`);
  return res.json();
}

export async function fetchDependencyMatrix(): Promise<DependencyMatrix> {
  const res = await fetch(`${API_BASE}/dependencies/matrix`);
  if (!res.ok) throw new Error(`Failed to fetch dependency matrix: ${res.statusText}`);
  return res.json();
}

export async function fetchBlastRadius(symbolId: string): Promise<BlastRadiusReport> {
  const encodedId = encodeURIComponent(symbolId);
  const res = await fetch(`${API_BASE}/dependencies/blast-radius/${encodedId}`);
  if (!res.ok) throw new Error(`Failed to calculate blast radius: ${res.statusText}`);
  return res.json();
}

export async function queryGraphRag(
  query: string,
  model: string = 'qwen2.5:0.5b',
  tokenBudgetMax: number = 16000
): Promise<RagQueryResponse> {
  const res = await fetch(`${API_BASE}/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, model, token_budget_max: tokenBudgetMax }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail?.detail || errorData.detail || `LLM query failed (${res.status})`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return res.json();
}

export async function scanRepository(directoryPath: string): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/index/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory_path: directoryPath }),
  });
  if (!res.ok) throw new Error(`Failed to scan repository: ${res.statusText}`);
  return res.json();
}
