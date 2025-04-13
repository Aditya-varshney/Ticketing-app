import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  autoConnect: true,
  withCredentials: false,
});

export default socket; 