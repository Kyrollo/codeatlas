export type SymbolKind =
  | 'MODULE'
  | 'FILE'
  | 'CLASS'
  | 'FUNCTION'
  | 'METHOD'
  | 'INTERFACE'
  | 'TYPE_ALIAS';

export type EdgeKind =
  | 'CONTAINS'
  | 'CALLS'
  | 'IMPORTS'
  | 'IMPLEMENTS'
  | 'EXTENDS'
  | 'REFERENCES';

export type LayerKind = 'API' | 'DOMAIN' | 'SERVICE' | 'CORE' | 'INFRASTRUCTURE';

export interface SymbolNode {
  id: string;
  name: string;
  kind: SymbolKind;
  file_path: string;
  line_start: number;
  line_end: number;
  docstring?: string | null;
  code_snippet: string;
  module: string;
  layer: LayerKind;
  complexity: number;
  loc: number;
  callers: string[];
  callees: string[];
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  kind: EdgeKind;
  metadata?: Record<string, unknown>;
}

export interface CodebaseGraph {
  project_name: string;
  root_path: string;
  nodes: Record<string, SymbolNode>;
  edges: GraphEdge[];
  modules: string[];
  total_files: number;
  total_symbols: number;
}

export interface SubgraphResponse {
  root_symbol_id: string;
  nodes: SymbolNode[];
  edges: GraphEdge[];
  depth: number;
}

export interface DependencyMatrix {
  modules: string[];
  matrix: Record<string, Record<string, number>>;
  circular_dependencies: string[][];
}

export interface BlastRadiusReport {
  symbol_id: string;
  symbol_name: string;
  kind: SymbolKind;
  file_path: string;
  direct_dependents: string[];
  transitive_dependents: string[];
  impact_percentage: number;
  affected_files: string[];
}

export interface RagContextNode {
  symbol_id: string;
  name: string;
  kind: SymbolKind;
  file_path: string;
  tokens: number;
  relevance_score: number;
}

export interface Citation {
  symbol_id: string;
  file_path: string;
  lines: string;
  snippet_preview: string;
}

export interface RagQueryResponse {
  query: string;
  answer: string;
  model: string;
  assembled_symbols: RagContextNode[];
  token_budget_used: number;
  token_budget_max: number;
  latency_ms: number;
  citations: Citation[];
}

export interface ScanResponse {
  scanned_files: number;
  total_files: number;
  total_symbols: number;
  directory_path: string;
}
