const StaticConsole = ({
  logs,
  onClear,
}: {
  logs: string[];
  onClear: () => void;
}) => {
  return (
    <div className="bg-card flex h-full flex-col overflow-hidden">
      <div className="bg-muted/30 flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-foreground text-sm font-semibold">Console</h1>
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-7 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium transition-colors"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
      <div className="text-foreground/90 flex-1 overflow-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-muted-foreground text-center">
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
