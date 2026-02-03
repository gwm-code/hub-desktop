import React, { useState, useRef, useEffect } from 'react';
import { Send, Hash, FileCode, Cpu, BarChart3 } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useFileStore } from '../store/useFileStore';
import { useEditorStore } from '../store/useEditorStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../hooks/useSocket';
import { DiffViewer } from './DiffViewer';
import { AgentNodes } from './AgentNodes';
import { createApi } from '../services/api';

export const ChatArea: React.FC = () => {
  const [input, setInput] = useState('');
  const [pendingPatch, setPendingPatch] = useState<{ path: string, content: string, oldContent: string } | null>(null);
  const { 
    messages, currentConversationId, isStreaming, activeTools, 
    model, availableModels, sessionTokens, totalTokens,
    setModel, setAvailableModels 
  } = useChatStore();
  const token = useAuthStore(state => state.token);
  const { readFile, writeFile, uploadFile } = useFileStore();
  const { activeFile, isLiveEditEnabled, setLiveEditEnabled } = useEditorStore();
  const { sendMessage } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const api = createApi();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await api.get('/api/models', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableModels(response.data);
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };
    if (token) fetchModels();
  }, [token, setAvailableModels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      // Pass context separately instead of modifying the message
      const context = (isLiveEditEnabled && activeFile) 
        ? { activeFile, mode: 'live-edit' }
        : undefined;
      
      sendMessage(currentConversationId, input, context);
      setInput('');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      // Upload to current workspace directory (usually /root/clawd/projects)
      await uploadFile(useFileStore.getState().currentPath, file);
      // Automatically append reference to input
      setInput(prev => {
        const ref = `[File Uploaded: ${file.name}]`;
        return prev ? `${prev}\n${ref}` : ref;
      });
    }
  };

  const handleApplySuggestion = async (content: string) => {
    // Basic regex to find file path and code in AI output
    // Assuming format like: ### File: /path/to/file.ts\n```typescript\nCODE\n```
    const fileMatch = content.match(/### File: (.*)/);
    const codeMatch = content.match(/```(?:[a-z]*)\n([\s\S]*?)```/);

    if (fileMatch && codeMatch) {
      const filePath = fileMatch[1].trim();
      const newCode = codeMatch[1];
      try {
        const oldCode = await readFile(filePath);
        setPendingPatch({ path: filePath, content: newCode, oldContent: oldCode });
      } catch (err) {
        alert("Could not read file for diff: " + filePath);
      }
    } else {
      alert("No valid file suggestion found in this message. Use format: ### File: path/to/file\n```\ncode\n```");
    }
  };

  const executePatch = async () => {
    if (pendingPatch) {
      try {
        await writeFile(pendingPatch.path, pendingPatch.content);
        setPendingPatch(null);
      } catch (err) {
        alert("Failed to write file: " + (err as Error).message);
      }
    }
  };

  return (
    <div 
      className={`flex flex-col h-full bg-zinc-950 transition-colors ${isDragging ? 'bg-zinc-900/50 ring-2 ring-blue-500 ring-inset' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Diff Viewer Overlay */}
      {pendingPatch && (
        <DiffViewer 
          fileName={pendingPatch.path}
          oldContent={pendingPatch.oldContent}
          newContent={pendingPatch.content}
          onApply={executePatch}
          onClose={() => setPendingPatch(null)}
        />
      )}
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          <Hash size={18} className="text-zinc-500 shrink-0" />
          <span className="font-semibold text-zinc-200 truncate whitespace-nowrap">
            {currentConversationId 
              ? (useChatStore.getState().conversations.find(c => c.id === currentConversationId)?.title || 'Conversation') 
              : 'New Chat'}
          </span>
        </div>
        <div className="flex-1 flex justify-center overflow-hidden mx-4">
          <AgentNodes />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
              <Hash size={32} />
            </div>
            <h2 className="text-xl font-medium text-zinc-300">Welcome to Hub Chat</h2>
            <p className="max-w-xs text-center text-sm">
              Your self-hosted command center. Start a conversation or use Cmd+K to explore.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                {msg.role === 'assistant' && msg.content.includes('### File:') && (
                  <button 
                    onClick={() => handleApplySuggestion(msg.content)}
                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg text-xs font-semibold text-blue-400 transition-colors"
                  >
                    <FileCode size={14} />
                    View & Apply Changes
                  </button>
                )}
                {msg.role === 'assistant' && msg.content === '' && isStreaming && (
                  <div className="flex gap-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent border-t border-zinc-900/50">
        <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between gap-4 px-1">
          {/* Model Selection */}
          <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-2 py-1.5 hover:border-zinc-700 transition-colors">
            <Cpu size={14} className="text-zinc-500" />
            <select 
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-zinc-300 focus:outline-none cursor-pointer pr-1"
            >
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-300">
                    {m.name}
                  </option>
                ))
              ) : (
                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
              )}
            </select>
          </div>

          {/* Token Stats Bar */}
          <div className="flex items-center gap-4 text-[10px] font-mono font-medium text-zinc-500">
            <div className="flex items-center gap-1.5">
              <BarChart3 size={12} className="text-zinc-600" />
              <span className="text-zinc-400">SESSION:</span>
              <span className={sessionTokens > 0 ? "text-blue-400" : "text-zinc-600"}>
                {sessionTokens.toLocaleString()} tokens
              </span>
            </div>
            <div className="w-px h-3 bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">TOTAL:</span>
              <span className={totalTokens > 0 ? "text-emerald-400" : "text-zinc-600"}>
                {totalTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>
        </div>

        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative group"
        >
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Send a message (Cmd+Enter)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
        
        {/* Live Edit Toggle */}
        {activeFile && (
          <div className="max-w-4xl mx-auto flex items-center gap-2 mt-2 px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isLiveEditEnabled}
                  onChange={(e) => setLiveEditEnabled(e.target.checked)}
                />
                <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                <div className="absolute left-1 top-1 w-2 h-2 bg-zinc-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-transform"></div>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${isLiveEditEnabled ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                Live Edit: <span className="font-mono lowercase normal-case">{activeFile.split('/').pop()}</span>
              </span>
            </label>
          </div>
        )}
        
        {/* Active Tools Indicator */}
        <div className="max-w-4xl mx-auto flex gap-2 mt-2 px-1 min-h-[20px]">
          {activeTools.map(tool => (
            <div key={tool} className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-blue-500/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">{tool}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-center text-zinc-600 mt-2">
          Hub Chat v3.0 | Secure & Audited AI Interface
        </p>
      </div>
    </div>
  );
};
