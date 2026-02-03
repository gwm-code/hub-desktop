import { io, Socket } from 'socket.io-client';
import { useSettingsStore } from '../store/useSettingsStore';

let socket: Socket | null = null;

export const getSocket = (token?: string) => {
  if (!socket && token) {
    const { serverUrl } = useSettingsStore.getState();
    socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('Global Socket Connected');
    });

    socket.on('disconnect', () => {
      console.log('Global Socket Disconnected');
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
