import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  expandable?: boolean;
  defaultMaxHeight?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  expandable = true,
  defaultMaxHeight = 'max-h-[500px]',
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="flex items-center justify-end gap-1.5 mb-1.5 opacity-90">
        {expandable && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
            title={isExpanded ? 'Collapse' : 'Expand full output'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>Show Full</span>
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
          title="Copy text"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div
        className={`overflow-y-auto pr-1 transition-all ${
          isExpanded ? 'max-h-none' : defaultMaxHeight
        } prose prose-invert prose-sm max-w-none text-foreground leading-relaxed font-sans`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ ...props }) => (
              <h1 className="text-base font-bold mt-2 mb-1 text-foreground border-b border-border pb-1" {...props} />
            ),
            h2: ({ ...props }) => (
              <h2 className="text-sm font-semibold mt-2 mb-1 text-foreground" {...props} />
            ),
            h3: ({ ...props }) => (
              <h3 className="text-xs font-semibold mt-1.5 mb-0.5 text-foreground" {...props} />
            ),
            p: ({ ...props }) => (
              <p className="my-1.5 text-xs text-foreground/90 leading-relaxed font-sans" {...props} />
            ),
            ul: ({ ...props }) => (
              <ul className="list-disc list-inside my-1.5 space-y-0.5 text-xs text-foreground/90 pl-1" {...props} />
            ),
            ol: ({ ...props }) => (
              <ol className="list-decimal list-inside my-1.5 space-y-0.5 text-xs text-foreground/90 pl-1" {...props} />
            ),
            li: ({ ...props }) => <li className="my-0.5 text-xs" {...props} />,
            blockquote: ({ ...props }) => (
              <blockquote className="border-l-2 border-cyan-500 pl-3 my-2 italic text-muted-foreground text-xs bg-muted/30 py-1 rounded-r" {...props} />
            ),
            code: ({ inline, ...props }: any) => {
              if (inline) {
                return (
                  <code className="bg-muted text-cyan-400 px-1 py-0.5 rounded font-mono text-[11px] border border-border" {...props} />
                );
              }
              return (
                <div className="relative my-2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 overflow-x-auto">
                  <pre className="font-mono text-xs text-zinc-100 m-0">
                    <code {...props} />
                  </pre>
                </div>
              );
            },
            table: ({ ...props }) => (
              <div className="overflow-x-auto my-2 rounded border border-border">
                <table className="w-full text-xs text-left divide-y divide-border" {...props} />
              </div>
            ),
            th: ({ ...props }) => (
              <th className="px-2 py-1 bg-muted font-semibold text-foreground text-[11px]" {...props} />
            ),
            td: ({ ...props }) => (
              <td className="px-2 py-1 border-t border-border text-foreground/90 text-xs" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};
