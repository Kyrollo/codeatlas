import React, { useState } from 'react';
import {
  FolderGit2,
  Cpu,
  Layers,
  FileCode2,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  projectName: string;
  totalFiles: number;
  totalSymbols: number;
  onScanDirectory: (path: string) => Promise<void>;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  totalFiles,
  totalSymbols,
  onScanDirectory,
  isScanning,
}) => {
  const [scanPath, setScanPath] = useState('src/');

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanPath.trim()) {
      onScanDirectory(scanPath.trim());
    }
  };

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-lg">
            CA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                CodeAtlas
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium font-mono">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Codebase Knowledge Graph & AST Symbol RAG Engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Metrics */}
          <div className="flex items-center gap-3 bg-muted/60 px-3 py-1.5 rounded-lg border border-border text-xs">
            <div className="flex items-center gap-1.5 text-foreground">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">{totalSymbols}</span>
              <span className="text-muted-foreground">Symbols</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-foreground">
              <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold">{totalFiles}</span>
              <span className="text-muted-foreground">Files</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Cpu className="w-3.5 h-3.5" />
              <span>GPU: Dedicated NVIDIA GPU</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>

          {/* Directory Scan Bar */}
          <form onSubmit={handleScanSubmit} className="flex items-center gap-1.5">
            <div className="relative">
              <FolderGit2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={scanPath}
                onChange={(e) => setScanPath(e.target.value)}
                placeholder="Scan directory (e.g. src/)"
                className="pl-8 pr-3 py-1.5 text-xs bg-muted/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500 w-44 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isScanning}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm shadow-cyan-600/30"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Index'}</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
};
