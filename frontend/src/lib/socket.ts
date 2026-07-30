import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

// Singleton socket instance — prevents multiple orphaned connections on re-renders
let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  const token = useAuthStore.getState().accessToken;
  const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

  // @ts-ignore
  if (!socketInstance || socketInstance.io.uri !== socketUrl) {
    // Disconnect old instance if URL changed (e.g., env var update)
    if (socketInstance) socketInstance.disconnect();

    socketInstance = io(socketUrl, {
      auth: { token },
      autoConnect: false,
    });
  } else {
    // Update auth token on re-use (handles token refresh)
    socketInstance.auth = { token };
  }

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
