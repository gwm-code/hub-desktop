import React from 'react';
import { X, Check } from 'lucide-react';

interface DiffViewerProps {
  fileName: string;
  oldContent: string;
  newContent: string;
  onApply: () => void;
  onClose: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ fileName, oldContent, newContent, onApply, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      <div className="flex flex-col w-full max-w-6xl h-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white">Apply Changes</h3>
            <code className="text-xs text-zinc-500">{fileName}</code>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden divide-x divide-zinc-800">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 bg-zinc-950 text-[10px] font-bold text-zinc-500 uppercase">Original</div>
            <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-zinc-400 bg-zinc-900/50">
              {oldContent}
            </pre>
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 bg-zinc-950 text-[10px] font-bold text-zinc-500 uppercase">New</div>
            <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-white bg-zinc-900/50">
              {newContent}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onApply}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            <Check size={18} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
