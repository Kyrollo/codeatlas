import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { InteractiveGraphTab } from './components/InteractiveGraphTab';
import { GraphRagTab } from './components/GraphRagTab';
import { DependencyMatrixTab } from './components/DependencyMatrixTab';
import { fetchGraph, scanRepository } from './lib/api';
import { CodebaseGraph, SymbolNode } from './types/codeatlas';
import { FileUploadZone } from './components/FileUploadZone';
import {
  Network,
  Sparkles,
  Grid,
  AlertTriangle,
  Loader2,
  FolderUp,
} from 'lucide-react';

export default function App() {
  const [graph, setGraph] = useState<CodebaseGraph | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'rag' | 'matrix' | 'uploads'>('graph');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolNode | null>(null);
  const [initialSymbolForBlast, setInitialSymbolForBlast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadGraph = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchGraph();
      setGraph(data);
      if (data.nodes && Object.values(data.nodes).length > 0) {
        setSelectedSymbol(Object.values(data.nodes)[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load codebase graph');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const handleScanDirectory = async (path: string) => {
    try {
      setIsScanning(true);
      await scanRepository(path);
      await loadGraph();
    } catch (err: any) {
      alert(`Scanning failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleInspectBlastRadius = (symbolId: string) => {
    setInitialSymbolForBlast(symbolId);
    setActiveTab('matrix');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header
        projectName={graph?.project_name || 'Codebase'}
        totalFiles={graph?.total_files || 0}
        totalSymbols={graph?.total_symbols || 0}
        onScanDirectory={handleScanDirectory}
        isScanning={isScanning}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card/40 px-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('graph')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'graph'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Interactive Knowledge Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('rag')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'rag'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Graph RAG Context Assembler</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'matrix'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Dependency Matrix & Blast Radius</span>
          </button>

          <button
            onClick={() => setActiveTab('uploads')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'uploads'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderUp className="w-4 h-4" />
            <span>Source Code & ZIP Upload</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-muted-foreground font-mono">
              Loading AST symbol graph and architectural layers...
            </p>
          </div>
        ) : error ? (
          <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-center">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 max-w-md">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <h3 className="text-sm font-semibold">Graph Load Failure</h3>
              <p className="text-xs mt-1 font-mono text-rose-300">{error}</p>
              <button
                onClick={loadGraph}
                className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'graph' && graph && (
              <InteractiveGraphTab
                graph={graph}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                onInspectBlastRadius={handleInspectBlastRadius}
              />
            )}
            {activeTab === 'rag' && graph && <GraphRagTab graph={graph} />}
            {activeTab === 'matrix' && graph && (
              <DependencyMatrixTab
                graph={graph}
                initialSymbolId={initialSymbolForBlast || selectedSymbol?.id}
              />
            )}
            {activeTab === 'uploads' && (
              <div className="p-6 max-w-5xl mx-auto space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Source Code & Repository Archive Upload</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload single files (.py, .ts, .js) or full project ZIP archives to parse AST nodes and extract dependency graphs.
                  </p>
                </div>
                <FileUploadZone
                  apiBaseUrl="/api/v1"
                  allowedExtensions={['.py', '.ts', '.tsx', '.js', '.jsx', '.json', '.zip', '.md', '.txt']}
                  acceptedFormatsText="Python (.py), TypeScript (.ts/.tsx), JavaScript, JSON, ZIP"
                  onFileProcessed={() => {
                    loadGraph();
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
