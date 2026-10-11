import React, { useState, useMemo } from 'react';
import {
  CodebaseGraph,
  SymbolNode,
  LayerKind,
  SymbolKind,
} from '../types/codeatlas';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code2,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface InteractiveGraphTabProps {
  graph: CodebaseGraph;
  selectedSymbol: SymbolNode | null;
  onSelectSymbol: (symbol: SymbolNode | null) => void;
  onInspectBlastRadius: (symbolId: string) => void;
}

const KIND_COLORS: Record<SymbolKind, { fill: string; stroke: string; text: string }> = {
  MODULE: { fill: '#334155', stroke: '#64748b', text: '#cbd5e1' },
  FILE: { fill: '#1e293b', stroke: '#475569', text: '#94a3b8' },
  CLASS: { fill: '#1e3a8a', stroke: '#3b82f6', text: '#93c5fd' },
  METHOD: { fill: '#4c1d95', stroke: '#8b5cf6', text: '#c4b5fd' },
  FUNCTION: { fill: '#064e3b', stroke: '#10b981', text: '#6ee7b7' },
  INTERFACE: { fill: '#78350f', stroke: '#f59e0b', text: '#fcd34d' },
  TYPE_ALIAS: { fill: '#701a75', stroke: '#d946ef', text: '#f0abfc' },
};

const LAYER_BADGES: Record<LayerKind, string> = {
  API: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  DOMAIN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  SERVICE: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  CORE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  INFRASTRUCTURE: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

export const InteractiveGraphTab: React.FC<InteractiveGraphTabProps> = ({
  graph,
  selectedSymbol,
  onSelectSymbol,
  onInspectBlastRadius,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter nodes
  const filteredNodes = useMemo(() => {
    return Object.values(graph.nodes).filter((node) => {
      const matchModule = selectedModule === 'all' || node.module === selectedModule;
      const matchLayer = selectedLayer === 'all' || node.layer === selectedLayer;
      const matchSearch =
        !searchQuery ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.file_path.toLowerCase().includes(searchQuery.toLowerCase());
      return matchModule && matchLayer && matchSearch;
    });
  }, [graph.nodes, selectedModule, selectedLayer, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filter edges where both ends are in filtered nodes
  const filteredEdges = useMemo(() => {
    return graph.edges.filter(
      (e) => filteredNodeIds.has(e.source_id) && filteredNodeIds.has(e.target_id)
    );
  }, [graph.edges, filteredNodeIds]);

  // Compute 2D node coordinates for SVG canvas
  const nodePositions = useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    const moduleList = Array.from(new Set(filteredNodes.map((n) => n.module))).sort();
    const moduleCenters: Record<string, { cx: number; cy: number }> = {};

    const totalModules = Math.max(1, moduleList.length);
    const radius = 300;
    const centerOffset = { x: 450, y: 350 };

    moduleList.forEach((mod, idx) => {
      const angle = (idx / totalModules) * 2 * Math.PI - Math.PI / 2;
      moduleCenters[mod] = {
        cx: centerOffset.x + radius * Math.cos(angle),
        cy: centerOffset.y + radius * Math.sin(angle),
      };
    });

    const nodesByModule: Record<string, SymbolNode[]> = {};
    filteredNodes.forEach((node) => {
      if (!nodesByModule[node.module]) nodesByModule[node.module] = [];
      nodesByModule[node.module].push(node);
    });

    Object.entries(nodesByModule).forEach(([mod, nodes]) => {
      const mCenter = moduleCenters[mod] || centerOffset;
      const nodeCount = nodes.length;
      const subRadius = Math.min(100, 30 + nodeCount * 18);

      nodes.forEach((node, idx) => {
        const subAngle = (idx / Math.max(1, nodeCount)) * 2 * Math.PI;
        coords[node.id] = {
          x: mCenter.cx + (nodeCount > 1 ? subRadius * Math.cos(subAngle) : 0),
          y: mCenter.cy + (nodeCount > 1 ? subRadius * Math.sin(subAngle) : 0),
        };
      });
    });

    return coords;
  }, [filteredNodes]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, z + 0.2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.4, z - 0.2));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] overflow-hidden">
      {/* Left Control Panel & Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* Filter Bar */}
        <div className="p-3 border-b border-border bg-card/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter symbols..."
                className="pl-8 pr-3 py-1 text-xs bg-muted/80 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500 w-44"
              />
            </div>

            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="text-xs py-1 px-2.5 bg-muted/80 border border-border rounded-md text-foreground focus:outline-none"
            >
              <option value="all">All Modules</option>
              {graph.modules.map((m) => (
                <option key={m} value={m}>
                  Module: {m}
                </option>
              ))}
            </select>

            {/* Layer Filter */}
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="text-xs py-1 px-2.5 bg-muted/80 border border-border rounded-md text-foreground focus:outline-none"
            >
              <option value="all">All Layers</option>
              <option value="API">API</option>
              <option value="SERVICE">SERVICE</option>
              <option value="DOMAIN">DOMAIN</option>
              <option value="CORE">CORE</option>
              <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
            </select>
          </div>

          {/* Zoom & Viewport Controls */}
          <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-lg border border-border">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset View"
              className="p-1.5 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-muted-foreground font-mono px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        </div>

        {/* 2D Knowledge Graph SVG Canvas */}
        <div className="flex-1 relative overflow-hidden bg-slate-950/40 select-none">
          <svg
            className="w-full h-full cursor-grab active:cursor-grabbing"
            viewBox="0 0 900 700"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="16"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" opacity="0.7" />
              </marker>
              <pattern
                id="graph-grid"
                width="30"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 30 0 L 0 0 0 30"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="0.5"
                  strokeOpacity="0.4"
                />
              </pattern>
            </defs>

            {/* Grid Background */}
            <rect width="100%" height="100%" fill="url(#graph-grid)" />

            <g
              transform={`translate(${panOffset.x + (1 - zoomLevel) * 450}, ${
                panOffset.y + (1 - zoomLevel) * 350
              }) scale(${zoomLevel})`}
            >
              {/* Edges */}
              {filteredEdges.map((edge) => {
                const src = nodePositions[edge.source_id];
                const tgt = nodePositions[edge.target_id];
                if (!src || !tgt) return null;

                const isConnectedToSelected =
                  selectedSymbol &&
                  (edge.source_id === selectedSymbol.id || edge.target_id === selectedSymbol.id);

                return (
                  <g key={edge.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isConnectedToSelected ? '#22d3ee' : '#334155'}
                      strokeWidth={isConnectedToSelected ? 2.5 : 1.2}
                      strokeDasharray={edge.kind === 'IMPORTS' ? '3,3' : undefined}
                      markerEnd="url(#arrowhead)"
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedSymbol?.id === node.id;
                const colors = KIND_COLORS[node.kind] || KIND_COLORS.FUNCTION;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => onSelectSymbol(node)}
                    className="cursor-pointer group"
                  >
                    {/* Outer Glow Ring on Selected */}
                    {isSelected && (
                      <circle
                        r="24"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Circle */}
                    <circle
                      r="16"
                      fill={colors.fill}
                      stroke={isSelected ? '#22d3ee' : colors.stroke}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-transform group-hover:scale-110 shadow-lg"
                    />

                    {/* Kind Letter Icon */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize="10"
                      fontWeight="bold"
                      fill={colors.text}
                      className="pointer-events-none font-mono"
                    >
                      {node.kind[0]}
                    </text>

                    {/* Node Label */}
                    <text
                      textAnchor="middle"
                      dy="30"
                      fontSize="11"
                      fill={isSelected ? '#f8fafc' : '#94a3b8'}
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="pointer-events-none drop-shadow"
                    >
                      {node.name.length > 20 ? `${node.name.slice(0, 18)}...` : node.name}
                    </text>

                    {/* Module pill subtitle */}
                    <text
                      textAnchor="middle"
                      dy="42"
                      fontSize="9"
                      fill="#64748b"
                      className="pointer-events-none font-mono"
                    >
                      {node.module}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Canvas Legend */}
          <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-md p-2.5 rounded-lg border border-border text-xs flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-muted-foreground">Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-muted-foreground">Method</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-muted-foreground">Function</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-muted-foreground">Interface</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Symbol Inspector Drawer */}
      <div className="w-full lg:w-96 border-l border-border bg-card/70 backdrop-blur-md flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-foreground">Symbol Inspector</h2>
          </div>
          {selectedSymbol && (
            <button
              onClick={() => onSelectSymbol(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          )}
        </div>

        {selectedSymbol ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted border border-border text-foreground">
                  {selectedSymbol.kind}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    LAYER_BADGES[selectedSymbol.layer]
                  }`}
                >
                  {selectedSymbol.layer}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground break-all">
                {selectedSymbol.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{selectedSymbol.file_path}</span>
                <span className="text-cyan-400 shrink-0">
                  :L{selectedSymbol.line_start}-{selectedSymbol.line_end}
                </span>
              </p>
            </div>

            {/* Cyclomatic Complexity & LOC */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-muted/60 border border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Complexity</span>
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold text-foreground mt-1">
                  {selectedSymbol.complexity}
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedSymbol.complexity > 5
                        ? 'bg-rose-500'
                        : selectedSymbol.complexity > 2
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, selectedSymbol.complexity * 12)}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/60 border border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Lines of Code</span>
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-lg font-bold text-foreground mt-1">
                  {selectedSymbol.loc}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Module: <span className="font-mono text-foreground">{selectedSymbol.module}</span>
                </p>
              </div>
            </div>

            {/* Docstring */}
            {selectedSymbol.docstring && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground italic">
                "{selectedSymbol.docstring}"
              </div>
            )}

            {/* Blast Radius Action */}
            <button
              onClick={() => onInspectBlastRadius(selectedSymbol.id)}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-rose-500/20 to-orange-500/20 border border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Calculate Blast Radius</span>
            </button>

            {/* Callers & Callees */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Callers ({selectedSymbol.callers.length})</span>
                </div>
                {selectedSymbol.callers.length > 0 ? (
                  <div className="space-y-1">
                    {selectedSymbol.callers.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          const target = graph.nodes[c];
                          if (target) onSelectSymbol(target);
                        }}
                        className="w-full text-left text-[11px] font-mono p-1.5 rounded bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-cyan-400 truncate block transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No known callers</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>Callees ({selectedSymbol.callees.length})</span>
                </div>
                {selectedSymbol.callees.length > 0 ? (
                  <div className="space-y-1">
                    {selectedSymbol.callees.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          const target = graph.nodes[c];
                          if (target) onSelectSymbol(target);
                        }}
                        className="w-full text-left text-[11px] font-mono p-1.5 rounded bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-blue-400 truncate block transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No external callees</p>
                )}
              </div>
            </div>

            {/* Code Snippet */}
            {selectedSymbol.code_snippet && (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1.5">
                  <span>Source Code</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Python AST</span>
                </div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-border text-[11px] font-mono text-cyan-200 overflow-x-auto leading-relaxed max-h-56">
                  <code>{selectedSymbol.code_snippet}</code>
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Code2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No Symbol Selected</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Click any node in the knowledge graph to view cyclomatic complexity, incoming callers,
              and code AST.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
