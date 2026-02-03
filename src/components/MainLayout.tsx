import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { ArtifactsPane } from './ArtifactsPane';
import { Terminal } from './Terminal';
import { CommandPalette } from './CommandPalette';
import { SettingsModal } from './SettingsModal';
import { PanelLeftOpen, LayoutPanelLeft, Terminal as TerminalIcon, Settings } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { showTerminal, isArtifactsOpen, setIsArtifactsOpen } = useSettingsStore();
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [artifactsWidth, setArtifactsWidth] = useState(600);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingArtifacts, setIsDraggingArtifacts] = useState(false);

  const startDraggingTerminal = (e: React.MouseEvent) => {
    setIsDraggingTerminal(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const startDraggingSidebar = (e: React.MouseEvent) => {
    setIsDraggingSidebar(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const startDraggingArtifacts = (e: React.MouseEvent) => {
    setIsDraggingArtifacts(true);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingTerminal) {
        e.preventDefault();
        const newHeight = window.innerHeight - e.clientY;
        const minHeight = 50;
        const maxHeight = window.innerHeight * 0.9;
        if (newHeight > minHeight && newHeight < maxHeight) {
          setTerminalHeight(newHeight);
        }
      }

      if (isDraggingSidebar) {
        e.preventDefault();
        const newWidth = e.clientX;
        const minWidth = 200;
        const maxWidth = 450;
        if (newWidth > minWidth && newWidth < maxWidth) {
          setSidebarWidth(newWidth);
        }
      }

      if (isDraggingArtifacts) {
        e.preventDefault();
        const newWidth = window.innerWidth - e.clientX;
        const minWidth = 300;
        const maxWidth = window.innerWidth * 0.8;
        if (newWidth > minWidth && newWidth < maxWidth) {
          setArtifactsWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTerminal(false);
      setIsDraggingSidebar(false);
      setIsDraggingArtifacts(false);
    };

    if (isDraggingTerminal || isDraggingSidebar || isDraggingArtifacts) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      
      let cursor = '';
      if (isDraggingTerminal) cursor = 'ns-resize';
      else cursor = 'ew-resize';
      
      document.body.style.cursor = cursor;
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingTerminal, isDraggingSidebar, isDraggingArtifacts]);

  // Auto-hide sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative w-full max-w-full">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div 
        style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
        className={`
          fixed md:relative z-30 h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden
          ${!isSidebarOpen ? 'border-none' : ''}
        `}
      >
        <div style={{ width: sidebarWidth }} className="h-full">
          <Sidebar toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          className="hidden md:block w-1.5 bg-transparent hover:bg-blue-500/50 cursor-ew-resize relative z-40 transition-colors shrink-0"
          onMouseDown={startDraggingSidebar}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Sidebar Toggle Button (Floating) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="fixed left-4 top-4 z-40 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white"
          >
            <PanelLeftOpen size={20} />
          </button>
        )}
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 relative">
            <ChatArea />
          </div>
          
          {showTerminal && (
            <div 
              style={{ height: terminalHeight }} 
              className="border-t border-zinc-800 bg-zinc-900 flex flex-col shrink-0 relative z-20"
            >
              <div 
                className="h-1.5 w-full bg-transparent hover:bg-blue-500/50 cursor-ns-resize absolute -top-0.5 z-30 transition-colors"
                onMouseDown={startDraggingTerminal}
              />
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <TerminalIcon size={14} />
                  <span>Terminal</span>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <Terminal />
              </div>
            </div>
          )}
        </div>
        
        {/* Artifacts Toggle Button (Floating) */}
        <div className="fixed right-4 top-4 z-40 flex gap-2" style={{ right: isArtifactsOpen ? artifactsWidth + 16 : 16 }}>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => setIsArtifactsOpen(!isArtifactsOpen)}
            className={`p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all`}
            title="Toggle Artifacts"
          >
            <LayoutPanelLeft size={20} />
          </button>
        </div>
      </main>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      {isArtifactsOpen && (
        <>
          <div 
            className="w-1.5 bg-transparent hover:bg-blue-500/50 cursor-ew-resize relative z-40 transition-colors shrink-0"
            onMouseDown={startDraggingArtifacts}
          />
          <div style={{ width: artifactsWidth }} className="shrink-0 h-full">
            <ArtifactsPane onClose={() => setIsArtifactsOpen(false)} />
          </div>
        </>
      )}

      <CommandPalette toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
    </div>
  );
};
