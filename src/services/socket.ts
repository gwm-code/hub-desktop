import { io, Socket } from 'socket.io-client';
import { useSettingsStore } from '../store/useSettingsStore';

let socket: Socket | null = null;
let currentUrl: string | null = null;

export const getSocket = (token?: string) => {
  const { serverUrl } = useSettingsStore.getState();

  // If URL changed, disconnect old socket
  if (socket && currentUrl !== serverUrl) {
    console.log('[Socket] URL changed, reconnecting...');
    socket.disconnect();
    socket = null;
  }

  if (!socket && token) {
    currentUrl = serverUrl;
    console.log('[Socket] Connecting to:', serverUrl);
    
    socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Global Socket Connected');
    });

    socket.on('disconnect', () => {
      console.log('Global Socket Disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket Connection Error:', err.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUrl = null;
  }
};
