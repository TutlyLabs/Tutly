const StaticConsole = ({
  logs,
  onClear,
}: {
  logs: string[];
  onClear: () => void;
}) => {
  return (
    <div className="flex h-full flex-col overflow-y-scroll bg-white">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold text-gray-600">Console</h1>
        <button
          className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-center text-gray-400">
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
