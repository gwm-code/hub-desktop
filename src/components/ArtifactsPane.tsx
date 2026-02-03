import React, { useEffect, useState, useRef } from 'react';
import { useFileStore } from '../store/useFileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useEditorStore } from '../store/useEditorStore';
import { useSocket } from '../hooks/useSocket';
import { X, FileText, Loader2, Save, Plus, FileCode, Check, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';

export const ArtifactsPane: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { lastReferencedFile, setLastReferencedFile, readFile, writeFile, uploadFile, currentPath } = useFileStore();
  const { setIsArtifactsOpen } = useSettingsStore();
  const { setActiveFile } = useEditorStore();
  const { socket } = useSocket();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewFile, setIsNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const editorRef = useRef<any>(null);
  const streamBuffer = useRef<string>('');

  useEffect(() => {
    setActiveFile(lastReferencedFile);
  }, [lastReferencedFile, setActiveFile]);

  useEffect(() => {
    if (lastReferencedFile && !isNewFile && !isStreaming) {
      loadContent(lastReferencedFile);
    }
  }, [lastReferencedFile, isNewFile, isStreaming]);

  // Listen for artifact stream events
  useEffect(() => {
    if (!socket) return;

    const handleArtifactStart = (data: { path: string }) => {
      // Never start streaming a database file
      if (data.path.includes('.db') || data.path.includes('.sqlite') || data.path.includes('.wal') || data.path.includes('.shm')) {
        console.log('[Artifacts] Ignoring database file start:', data.path);
        return;
      }
      
      console.log('[Artifacts] Start:', data.path);
      setIsArtifactsOpen(true);
      setLastReferencedFile(data.path);
      setIsStreaming(true);
      setContent('');
      streamBuffer.current = '';
    };

    const handleArtifactStream = (data: { path: string, token: string }) => {
      // Skip database files
      if (data.path.includes('.db') || data.path.includes('.sqlite') || data.path.includes('.wal')) {
        return;
      }
      
      console.log('[Artifacts] Stream Token:', data.token.length);
      streamBuffer.current += data.token;
      const newContent = streamBuffer.current;
      setContent(newContent);
      
      // Sync with Monaco
      if (editorRef.current) {
        editorRef.current.setValue(newContent);
      }
    };

    const handleArtifactUpdate = (data: { path: string, content: string }) => {
      console.log('[Artifacts] Update Received:', data.path);
      
      // CRITICAL: Never display database or binary files in the editor
      if (data.path.includes('.db') || data.path.includes('.sqlite') || data.path.includes('.wal') || data.path.includes('.shm')) {
        console.log('[Artifacts] Ignoring database file update:', data.path);
        return;
      }
      
      // Only update if this is the currently open file OR if no file is open
      if (lastReferencedFile && data.path !== lastReferencedFile) {
        console.log(`[Artifacts] Ignoring update for ${data.path}, current file is ${lastReferencedFile}`);
        return;
      }
      
      setIsArtifactsOpen(true);
      setLastReferencedFile(data.path);
      setContent(data.content);
      streamBuffer.current = data.content;
      
      // Force Monaco update if it's mounted
      if (editorRef.current) {
        editorRef.current.setValue(data.content);
      }
    };

    const handleChatComplete = () => {
      setIsStreaming(false);
    };

    socket.on('artifact.start', handleArtifactStart);
    socket.on('artifact.stream', handleArtifactStream);
    socket.on('artifact.update', handleArtifactUpdate);
    socket.on('chat.complete', handleChatComplete);

    return () => {
      socket.off('artifact.start', handleArtifactStart);
      socket.off('artifact.stream', handleArtifactStream);
      socket.off('artifact.update', handleArtifactUpdate);
      socket.off('chat.complete', handleChatComplete);
    };
  }, [socket, lastReferencedFile, setIsArtifactsOpen, setLastReferencedFile]);

  const loadContent = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await readFile(path);
      setContent(data);
      setIsNewFile(false);
    } catch (err: any) {
      console.error('Failed to load artifact content', err);
      setError('Error loading file content: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleSave = async () => {
    let path = lastReferencedFile;
    
    if (isNewFile) {
      if (!newFileName.trim()) {
        setError('Please enter a filename');
        return;
      }
      path = `${currentPath}/${newFileName.trim()}`;
    }

    if (!path) return;

    setSaving(true);
    setError(null);
    try {
      const currentContent = editorRef.current ? editorRef.current.getValue() : content;
      await writeFile(path, currentContent);
      setIsSaved(true);
      setIsNewFile(false);
      setLastReferencedFile(path);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to save artifact', err);
      setError('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleNewFile = () => {
    setIsNewFile(true);
    setContent('');
    setNewFileName('');
    setLastReferencedFile(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check for internal file drop
    const internalFileData = e.dataTransfer.getData('application/hub-chat-file');
    if (internalFileData) {
      try {
        const file = JSON.parse(internalFileData);
        setLastReferencedFile(file.path);
        setIsArtifactsOpen(true);
        return;
      } catch (err) {
        console.error('Failed to parse dropped file data', err);
      }
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setLoading(true);
      setError(null);
      try {
        await uploadFile(currentPath, file);
        const path = `${currentPath}/${file.name}`;
        setLastReferencedFile(path);
        await loadContent(path);
        setIsArtifactsOpen(true);
      } catch (err: any) {
        setError('Upload failed: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const getLanguage = (filename: string | null) => {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return 'javascript';
      case 'ts': case 'tsx': return 'typescript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'sh': return 'shell';
      case 'sql': return 'sql';
      case 'yml': case 'yaml': return 'yaml';
      default: return 'plaintext';
    }
  };

  if (!lastReferencedFile && !isNewFile) {
    return (
      <div 
        className="h-full border-l border-zinc-800 flex flex-col bg-zinc-950"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
      >
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-200">Artifacts</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleNewFile}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              title="New File"
            >
              <Plus size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
          <div className="relative mb-4">
            <FileCode size={48} className="opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Plus size={20} className="opacity-40 translate-x-4 translate-y-4" />
            </div>
          </div>
          <p className="text-sm">No artifacts open.</p>
          <p className="text-xs mt-2 italic">Drag files here or click '+' to create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full border-l border-zinc-800 flex flex-col bg-zinc-950 relative"
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
    >
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
          <FileText size={16} className="text-blue-400 shrink-0" />
          {isNewFile ? (
            <input
              autoFocus
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm px-2 py-1 rounded outline-none focus:border-blue-500 w-full"
              placeholder="filename.ext"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          ) : (
            <span className="font-medium text-zinc-200 truncate text-sm">
              {lastReferencedFile?.split('/').pop()}
            </span>
          )}
          {isStreaming && (
            <div className="flex items-center gap-1.5 ml-2 text-blue-400">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider font-semibold animate-pulse">Agent Typing...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isSaved 
                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50'
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : (isSaved ? <Check size={14} /> : <Save size={14} />)}
            {isSaved ? 'Saved' : 'Save'}
          </button>
          
          <button 
            onClick={handleNewFile}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            title="New File"
          >
            <Plus size={18} />
          </button>
          
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="text-xs text-zinc-400 animate-pulse">Loading artifact...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-4 right-4 z-30 bg-red-900/20 border border-red-500/50 p-3 rounded-lg flex items-start gap-3 text-red-200 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        <Editor
          height="100%"
          theme="vs-dark"
          language={getLanguage(isNewFile ? newFileName : lastReferencedFile)}
          value={content}
          onMount={handleEditorDidMount}
          onChange={(val) => setContent(val || '')}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            unicodeHighlight: {
              ambiguousCharacters: false,
              invisibleCharacters: false
            },
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            }
          }}
        />
      </div>
      
      {!isNewFile && lastReferencedFile && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <div className="text-[10px] text-zinc-600 truncate font-mono">
            {lastReferencedFile}
          </div>
        </div>
      )}
    </div>
  );
};
