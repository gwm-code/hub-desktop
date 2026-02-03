import React from 'react';
import { Plus, MessageSquare, Settings, LogOut, Edit2, Trash2, LayoutPanelLeft } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { FileBrowser } from './FileBrowser';

import api from '../services/api';

interface SidebarProps {
  toggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ toggle }) => {
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversationId, 
    clearMessages, 
    setConversations,
    setMessages,
    addConversation
  } = useChatStore();
  const { showTerminal, setShowTerminal } = useSettingsStore();
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
      
      // Auto-select most recent if none selected
      if (!currentConversationId && response.data.length > 0) {
        setCurrentConversationId(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const response = await api.get(`/api/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  React.useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token]);

  React.useEffect(() => {
    if (currentConversationId && token) {
      // Check if we already have these messages or if it's a new empty chat
      const isNewChat = !conversations.find(c => c.id === currentConversationId);
      if (!isNewChat) {
        fetchMessages(currentConversationId);
      } else {
        clearMessages();
      }
    }
  }, [currentConversationId]);

  const handleNewChat = () => {
    const newId = Math.random().toString(36).substring(2, 15);
    const newConv = {
      id: newId,
      title: 'New Conversation',
      created_at: new Date().toISOString()
    };
    addConversation(newConv);
    setCurrentConversationId(newId);
    clearMessages();
  };

  const startEditing = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle || 'New Conversation');
  };

  const saveTitle = async (id: string) => {
    try {
      const response = await api.patch(`/api/conversations/${id}`, 
        { title: editTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        setConversations(conversations.map(c => c.id === id ? { ...c, title: editTitle } : c));
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await api.delete(`/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        const newConversations = conversations.filter(c => c.id !== id);
        setConversations(newConversations);
        if (currentConversationId === id) {
          if (newConversations.length > 0) {
            setCurrentConversationId(newConversations[0].id);
          } else {
            handleNewChat();
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  return (
    <div className={`flex flex-col bg-zinc-900 border-r border-zinc-800 h-full w-full overflow-hidden`}>
      <div className="p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={handleNewChat}
            className="flex-1 flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg transition-colors group shrink-0"
          >
            <Plus size={18} className="text-zinc-400 group-hover:text-white" />
            <span className="font-medium">New Chat</span>
          </button>
          <button 
            onClick={toggle}
            className="p-3 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Collapse Sidebar"
          >
            <LayoutPanelLeft size={18} className="rotate-180" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2 min-h-0">
          <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Chats</div>
          {conversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setCurrentConversationId(chat.id)}
              className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                currentConversationId === chat.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <MessageSquare size={16} className="shrink-0" />
              {editingId === chat.id ? (
                <input
                  autoFocus
                  className="bg-zinc-950 border border-zinc-700 rounded px-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveTitle(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle(chat.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="truncate flex-1">{chat.title || 'New Conversation'}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-40">
                    <button
                      onClick={(e) => startEditing(e, chat.id, chat.title)}
                      className="p-1 hover:bg-zinc-700 hover:text-white rounded"
                      title="Rename"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => deleteConversation(e, chat.id)}
                      className="p-1 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 rounded"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <FileBrowser />

        <div className="mt-auto pt-4 border-t border-zinc-800 space-y-1 shrink-0">
          <button 
            onClick={() => setShowTerminal(!showTerminal)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              showTerminal 
                ? 'bg-zinc-800 text-blue-400 font-medium' 
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <Settings size={16} />
            <span>Show Terminal</span>
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

