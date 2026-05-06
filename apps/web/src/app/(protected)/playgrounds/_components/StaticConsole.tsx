import { Terminal, Trash2 } from "lucide-react";

const StaticConsole = ({
  logs,
  onClear,
}: {
  logs: string[];
  onClear: () => void;
}) => {
  return (
    <div className="bg-card flex h-full flex-col overflow-hidden">
      <div className="bg-card flex h-9 shrink-0 items-center justify-between border-b px-3">
        <div className="text-foreground inline-flex items-center gap-2 text-sm font-medium">
          <Terminal className="h-4 w-4 text-emerald-500" />
          Console
          {logs.length > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
              {logs.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="hover:bg-accent text-muted-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
      <div className="text-foreground/90 flex-1 overflow-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center">
            No console output yet.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="whitespace-pre-wrap">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaticConsole;
