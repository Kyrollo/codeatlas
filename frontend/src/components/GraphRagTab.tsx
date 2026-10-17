import React, { useState } from 'react';
import {
  RagQueryResponse,
  CodebaseGraph,
} from '../types/codeatlas';
import { queryGraphRag } from '../lib/api';
import {
  Sparkles,
  Search,
  Cpu,
  Clock,
  BookOpen,
  FileCode,
  AlertCircle,
  CheckCircle2,
  Send,
  Boxes,
  Zap,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface GraphRagTabProps {
  graph: CodebaseGraph;
}

export const GraphRagTab: React.FC<GraphRagTabProps> = ({ graph }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RagQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQueries = [
    'How does checkout orchestrate Stripe payments and inventory reservation?',
    'Trace how AuthMiddleware validates JWT bearer tokens with Redis blacklist',
    'Which components interact with the Redis connection pool?',
  ];

  const handleExecuteQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setError(null);
    setQuery(queryText);

    try {
      const resp = await queryGraphRag(queryText, 'qwen2.5:0.5b', 16000);
      setResult(resp);
    } catch (err: any) {
      setError(err.message || 'Failed to execute Graph RAG query');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden bg-background">
      {/* Top Query Input & Chips */}
      <div className="p-4 border-b border-border bg-card/40 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteQuery(query);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask architectural question across codebase (e.g. How does checkout interact with Stripe?)..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted/80 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-cyan-600/20"
          >
            {isLoading ? (
              <>
                <Zap className="w-4 h-4 animate-spin text-cyan-200" />
                <span>Assembling Context...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ask Graph</span>
              </>
            )}
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-medium">Quick Prompts:</span>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleExecuteQuery(q)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors text-left truncate max-w-md"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Split Context Assembler & AI Generation */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Assembled Dependency Subgraph Context (5 cols) */}
        <div className="lg:col-span-5 border-r border-border bg-card/30 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-foreground">Assembled Subgraph Context</h2>
            </div>
            {result && (
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {result.assembled_symbols.length} Symbols
              </span>
            )}
          </div>

          {/* Token Budget Meter */}
          {result && (
            <div className="p-3 border-b border-border bg-muted/20">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-muted-foreground">Token Budget Allocation</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {result.token_budget_used} / {result.token_budget_max} tokens
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (result.token_budget_used / result.token_budget_max) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Assembled Symbol List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {result?.assembled_symbols.length ? (
              result.assembled_symbols.map((node) => (
                <div
                  key={node.symbol_id}
                  className="p-3 rounded-xl bg-card border border-border shadow-sm hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted border border-border text-foreground">
                      {node.kind}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Relevance: {node.relevance_score}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground font-mono break-all">
                    {node.name}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 font-mono">
                    <span className="truncate">{node.file_path}</span>
                    <span className="text-cyan-400 font-semibold shrink-0">~{node.tokens} tok</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <Boxes className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs">No graph context assembled yet.</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Run a query to retrieve AST symbols into context.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Generation & Grounded Citations (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-card/10">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-foreground">Grounded Architecture Answer</h2>
            </div>

            {result && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  {result.latency_ms}ms
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <Cpu className="w-3.5 h-3.5" />
                  {result.model}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold">Query Failed</h4>
                  <p className="text-xs mt-1 text-rose-300 font-mono">{error}</p>
                </div>
              </div>
            )}

            {result ? (
              <div className="space-y-6">
                {/* Generated Answer */}
                <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>Ollama Verified Analysis</span>
                  </div>
                  <MarkdownRenderer content={result.answer} defaultMaxHeight="max-h-[500px]" />
                </div>

                {/* Grounded Citations */}
                {result.citations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span>Codebase Grounded Citations ({result.citations.length})</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.citations.map((cite, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950 border border-border text-xs font-mono space-y-2 hover:border-cyan-500/40 transition-colors"
                        >
                          <div className="flex items-center justify-between text-cyan-400">
                            <span className="truncate font-semibold">{cite.file_path}</span>
                            <span className="text-cyan-300 text-[11px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                              {cite.lines}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {cite.symbol_id}
                          </p>
                          <pre className="text-[10px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                            {cite.snippet_preview}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Sparkles className="w-10 h-10 text-cyan-500/40 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">Ask Your Codebase</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  CodeAtlas traverses AST references, extracts relevant caller/callee neighborhoods,
                  and generates answers grounded with precise citations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
