import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  cumulative_tokens?: number;
  created_at: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  activeTools: string[];
  model: string;
  availableModels: Model[];
  sessionTokens: number;
  totalTokens: number;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setCurrentConversationId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  updateLastMessage: (content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setToolUse: (tool: string, active: boolean) => void;
  setModel: (model: string) => void;
  setAvailableModels: (models: Model[]) => void;
  setTokens: (sessionTokens: number, totalTokens: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  activeTools: [],
  model: 'gemini-3-flash-preview',
  availableModels: [],
  sessionTokens: 0,
  totalTokens: 0,
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) => set((state) => ({ 
    conversations: [conversation, ...state.conversations.filter(c => c.id !== conversation.id)] 
  })),
  setCurrentConversationId: (id) => set((state) => {
    const conv = state.conversations.find(c => c.id === id);
    return { 
      currentConversationId: id,
      totalTokens: conv?.cumulative_tokens || 0,
      sessionTokens: 0
    };
  }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  updateLastMessage: (content) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > 0) {
      // Fix: Find the pending message and update it instead of always the last one if we have multiple
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg.role === 'assistant') {
        lastMsg.content += content;
      }
    }
    return { messages: newMessages };
  }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setToolUse: (tool, active) => set((state) => ({
    activeTools: active 
      ? [...new Set([...state.activeTools, tool])]
      : state.activeTools.filter(t => t !== tool)
  })),
  setModel: (model) => set({ model }),
  setAvailableModels: (availableModels) => set({ availableModels }),
  setTokens: (sessionTokens, totalTokens) => set({ sessionTokens, totalTokens }),
}));
