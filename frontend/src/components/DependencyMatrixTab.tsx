import React, { useState, useEffect } from 'react';
import {
  DependencyMatrix,
  BlastRadiusReport,
  CodebaseGraph,
} from '../types/codeatlas';
import { fetchDependencyMatrix, fetchBlastRadius } from '../lib/api';
import {
  Grid,
  AlertTriangle,
  Flame,
  FileCode2,
  CheckCircle2,
  Share2,
  TrendingUp,
  Search,
} from 'lucide-react';

interface DependencyMatrixTabProps {
  graph: CodebaseGraph;
  initialSymbolId?: string | null;
}

export const DependencyMatrixTab: React.FC<DependencyMatrixTabProps> = ({
  graph,
  initialSymbolId,
}) => {
  const [matrixData, setMatrixData] = useState<DependencyMatrix | null>(null);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>(
    initialSymbolId || Object.keys(graph.nodes)[0] || ''
  );
  const [blastReport, setBlastReport] = useState<BlastRadiusReport | null>(null);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(true);
  const [isLoadingBlast, setIsLoadingBlast] = useState(false);

  useEffect(() => {
    fetchDependencyMatrix()
      .then((data) => setMatrixData(data))
      .catch((err) => console.error('Error fetching dependency matrix:', err))
      .finally(() => setIsLoadingMatrix(false));
  }, []);

  useEffect(() => {
    if (selectedSymbolId) {
      setIsLoadingBlast(true);
      fetchBlastRadius(selectedSymbolId)
        .then((report) => setBlastReport(report))
        .catch((err) => console.error('Error fetching blast radius:', err))
        .finally(() => setIsLoadingBlast(false));
    }
  }, [selectedSymbolId]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] overflow-hidden bg-background">
      {/* Left Column: Cross-Module Coupling Matrix (7 cols) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-border bg-card/20">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/40">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-foreground">
              Cross-Module Coupling Heatmap
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Call & import references between architectural packages
          </span>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Circular Dependencies Alert */}
          {matrixData && matrixData.circular_dependencies.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Detected {matrixData.circular_dependencies.length} Circular Dependency Cycle(s)</span>
              </div>
              <div className="text-xs text-amber-300 font-mono space-y-1">
                {matrixData.circular_dependencies.map((cycle, idx) => (
                  <div key={idx} className="bg-amber-950/40 px-2.5 py-1 rounded border border-amber-800/40">
                    Cycle: {cycle.join(' ↔ ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matrix Heatmap Table */}
          {matrixData ? (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm p-4">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2.5 text-xs font-semibold text-muted-foreground text-left border-b border-border">
                      Source \ Target
                    </th>
                    {matrixData.modules.map((mod) => (
                      <th
                        key={mod}
                        className="p-2.5 text-xs font-mono font-bold text-cyan-400 border-b border-border uppercase"
                      >
                        {mod}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.modules.map((srcMod) => (
                    <tr key={srcMod} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-2.5 text-xs font-mono font-bold text-foreground text-left uppercase">
                        {srcMod}
                      </td>
                      {matrixData.modules.map((tgtMod) => {
                        const count = matrixData.matrix[srcMod]?.[tgtMod] || 0;
                        const isSelf = srcMod === tgtMod;

                        let bgClass = 'bg-slate-900/40 text-slate-600';
                        if (count > 0) {
                          bgClass =
                            count >= 3
                              ? 'bg-cyan-500/40 text-cyan-200 font-bold border border-cyan-500/50'
                              : 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30';
                        }
                        if (isSelf) {
                          bgClass = 'bg-slate-950 text-slate-700';
                        }

                        return (
                          <td key={tgtMod} className="p-2">
                            <div
                              className={`w-10 h-10 rounded-lg mx-auto flex items-center justify-center text-xs font-mono transition-transform hover:scale-105 ${bgClass}`}
                              title={`${srcMod} calls ${tgtMod}: ${count} references`}
                            >
                              {isSelf ? '-' : count}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Loading matrix telemetry...
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Blast Radius Impact Inspector (5 cols) */}
      <div className="w-full lg:w-[440px] flex flex-col h-full overflow-hidden bg-card/60 backdrop-blur-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-foreground">Blast Radius Inspector</h2>
          </div>
          {blastReport && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
              {blastReport.impact_percentage}% Impact
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Symbol Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Select Target Symbol to Analyze Impact
            </label>
            <select
              value={selectedSymbolId}
              onChange={(e) => setSelectedSymbolId(e.target.value)}
              className="w-full text-xs font-mono py-2 px-3 bg-muted/80 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500 truncate"
            >
              {Object.values(graph.nodes).map((sym) => (
                <option key={sym.id} value={sym.id}>
                  {sym.module} :: {sym.name} ({sym.kind})
                </option>
              ))}
            </select>
          </div>

          {blastReport && (
            <div className="space-y-4">
              {/* Impact Percentage Gauge Card */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Codebase Ripple Effect</span>
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-400 font-mono">
                    {blastReport.impact_percentage}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of repository affected ({blastReport.transitive_dependents.length} symbols)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500"
                    style={{ width: `${Math.min(100, blastReport.impact_percentage * 2)}%` }}
                  ></div>
                </div>
              </div>

              {/* Direct vs Transitive Dependents */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                    <Share2 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Direct Callers ({blastReport.direct_dependents.length})</span>
                  </div>
                  {blastReport.direct_dependents.length > 0 ? (
                    <div className="space-y-1">
                      {blastReport.direct_dependents.map((dep) => (
                        <div
                          key={dep}
                          className="text-[11px] font-mono p-2 rounded-lg bg-muted/50 border border-border text-foreground truncate"
                        >
                          {dep}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      No direct incoming dependents (entrypoint or leaf).
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Transitive Reached Dependents ({blastReport.transitive_dependents.length})</span>
                  </div>
                  {blastReport.transitive_dependents.length > 0 ? (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {blastReport.transitive_dependents.map((dep) => (
                        <div
                          key={dep}
                          className="text-[11px] font-mono p-2 rounded-lg bg-muted/30 border border-border text-muted-foreground truncate"
                        >
                          {dep}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">None</p>
                  )}
                </div>

                {/* Affected Files List */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                    <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Affected Source Files ({blastReport.affected_files.length})</span>
                  </div>
                  <div className="space-y-1">
                    {blastReport.affected_files.map((file) => (
                      <div
                        key={file}
                        className="text-[11px] font-mono p-1.5 rounded bg-slate-950 border border-border text-cyan-300 truncate"
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
