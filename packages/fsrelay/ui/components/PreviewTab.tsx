import React, { useState } from "react";

interface PreviewPort {
  id: string;
  port: number;
  url: string;
  title?: string;
}

export function PreviewTab() {
  const [previews, setPreviews] = useState<PreviewPort[]>([
    {
      id: "1",
      port: 8000,
      url: "http://localhost:8000",
      title: "Application"
    }
  ]);
  const [activePreviewId, setActivePreviewId] = useState<string>("1");
  const [showAddInput, setShowAddInput] = useState(false);
  const [newPortInput, setNewPortInput] = useState("");

  const addPreview = (port: number) => {
    const newPreview: PreviewPort = {
      id: Date.now().toString(),
      port,
      url: `http://localhost:${port}`,
      title: `Port ${port}`
    };
    setPreviews([...previews, newPreview]);
    setActivePreviewId(newPreview.id);
  };

  const handleAddPreview = () => {
    const portNum = parseInt(newPortInput.trim());
    if (!isNaN(portNum) && portNum > 0 && portNum < 65536) {
      addPreview(portNum);
      setNewPortInput("");
      setShowAddInput(false);
    }
  };

  const closePreview = (id: string) => {
    const newPreviews = previews.filter(p => p.id !== id);
    setPreviews(newPreviews);
    if (activePreviewId === id && newPreviews.length > 0) {
      setActivePreviewId(newPreviews[0].id);
    }
  };

  const activePreview = previews.find(p => p.id === activePreviewId);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Preview Tabs Bar */}
      <div className="flex items-center bg-[#252526] border-b border-[#3e3e3e]">
        {previews.map((preview) => {
          const isActive = activePreviewId === preview.id;
          return (
            <div
              key={preview.id}
              className={`
                group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-b-2 transition-all
                ${isActive
                  ? 'bg-[#1e1e1e] border-blue-500 text-white'
                  : 'border-transparent text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2a2a]'
                }
              `}
              onClick={() => setActivePreviewId(preview.id)}
            >
              <span className={`text-sm ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {preview.port}
              </span>
              <button
                className={`
                  p-0.5 rounded transition-colors
                  ${isActive
                    ? 'hover:bg-red-500/20 hover:text-red-400'
                    : 'hover:bg-[#3e3e3e] opacity-0 group-hover:opacity-100'
                  }
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  closePreview(preview.id);
                }}
                title="Close"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Add Preview Button or Input */}
        {showAddInput ? (
          <div className="flex items-center gap-1 px-2 bg-[#2a2a2a]">
            <input
              type="number"
              value={newPortInput}
              onChange={(e) => setNewPortInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPreview();
                } else if (e.key === 'Escape') {
                  setShowAddInput(false);
                  setNewPortInput("");
                }
              }}
              placeholder="Port (e.g., 3000)"
              className="w-28 px-2 py-1.5 bg-[#1e1e1e] text-[#cccccc] text-xs border border-[#3e3e3e] rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="button"
              className="px-2 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              onClick={handleAddPreview}
            >
              Add
            </button>
            <button
              type="button"
              className="px-2 py-1.5 text-xs text-[#858585] hover:text-[#cccccc] transition-colors"
              onClick={() => {
                setShowAddInput(false);
                setNewPortInput("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="px-4 py-2.5 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2a2a] transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAddInput(true);
            }}
            title="Add new preview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs">Add</span>
          </button>
        )}
      </div>

      {/* Preview Content */}
      {activePreview ? (
        <div className="flex-1 flex flex-col">
          {/* Browser Controls Bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] border-b border-[#3e3e3e]">
            {/* Navigation Buttons */}
            <button
              className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled
              title="Back (disabled)"
            >
              <svg className="w-4 h-4 text-[#cccccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled
              title="Forward (disabled)"
            >
              <svg className="w-4 h-4 text-[#cccccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors"
              onClick={(e) => {
                e.preventDefault();
                const iframe = document.querySelector(`iframe[title="Preview Port ${activePreview.port}"]`) as HTMLIFrameElement;
                if (iframe && iframe.src) {
                  const currentSrc = iframe.src;
                  iframe.src = '';
                  setTimeout(() => {
                    iframe.src = currentSrc;
                  }, 10);
                }
              }}
              title="Reload preview"
            >
              <svg className="w-4 h-4 text-[#cccccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* URL Bar */}
            <div className="flex-1 flex items-center gap-2 bg-[#1e1e1e] px-3 py-1.5 rounded text-sm">
              <svg className="w-3.5 h-3.5 text-[#858585] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[#cccccc] font-mono truncate select-all">{activePreview.url}</span>
            </div>

            {/* Actions */}
            <button
              className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors"
              onClick={(e) => {
                e.preventDefault();
                try {
                  window.open(activePreview.url, '_blank', 'noopener,noreferrer');
                } catch (error) {
                  console.error('Failed to open in new tab:', error);
                }
              }}
              title="Open in new tab"
            >
              <svg className="w-4 h-4 text-[#cccccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>

          {/* iframe Preview */}
          <div className="flex-1 relative bg-white">
            <iframe
              key={activePreview.id}
              src={activePreview.url}
              className="w-full h-full border-0"
              title={`Preview Port ${activePreview.port}`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
          <div className="text-center">
            <svg className="w-16 h-16 text-[#858585] mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-[#cccccc] mb-1">No preview available</p>
            <p className="text-sm text-[#858585]">Click <span className="font-semibold">+</span> to add a preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
