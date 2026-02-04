import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { getSocket, disconnectSocket } from '../services/socket';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const token = useAuthStore((state) => state.token);
  const { addMessage, updateLastMessage, setIsStreaming, setToolUse, setTokens, model } = useChatStore();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const s = getSocket(token);
    if (!s) return;

    setSocket(s);

    // Use stable handlers and prevent duplicate listeners to fix stuttering/echoing
    const onStatus = (data: any) => {
      console.log('Status:', data.status);
      if (data.status === 'thinking' || data.status === 'writing') {
        setIsStreaming(true);
      }
    };

    const onToken = (data: any) => {
      // Use technical extraction logic to filter technical logs and JSON leaks
      let token = data.token;
      if (token.includes('injecting env') || token.includes('"level":')) {
        return;
      }
      updateLastMessage(token);
    };

    const onTokenUpdate = (data: any) => {
      setTokens(data.sessionTokens, data.totalTokens);
    };

    const onToolUse = (data: any) => {
      console.log('Tool Use:', data);
      setToolUse(data.tool, data.active ?? true);
    };

    const onComplete = () => {
      setIsStreaming(false);
    };

    // WIPE existing listeners to prevent cumulative echoing
    s.removeAllListeners('chat.status');
    s.removeAllListeners('chat.token');
    s.removeAllListeners('chat.token_update');
    s.removeAllListeners('chat.tool_use');
    s.removeAllListeners('chat.complete');

    s.on('chat.status', onStatus);
    s.on('chat.token', onToken);
    s.on('chat.token_update', onTokenUpdate);
    s.on('chat.tool_use', onToolUse);
    s.on('chat.complete', onComplete);

    return () => {
      s.off('chat.status', onStatus);
      s.off('chat.token', onToken);
      s.off('chat.token_update', onTokenUpdate);
      s.off('chat.tool_use', onToolUse);
      s.off('chat.complete', onComplete);
    };
  }, [token]);

  const sendMessage = (conversationId: string | null, content: string, context?: { activeFile: string; mode: string }) => {
    if (socket && socket.connected) {
      // Add user message to store
      addMessage({
        id: Math.random().toString(36).substring(7),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      });

      // Prepare assistant message slot
      addMessage({
        id: 'pending',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      });

      socket.emit('chat.message', { conversationId, content, context, model });
    }
  };

  return { sendMessage, socket };
};
