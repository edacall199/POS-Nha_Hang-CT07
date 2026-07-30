import { Server, Socket } from 'socket.io';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join:restaurant', () => {
      socket.join('restaurant');
      console.log(`[Socket] ${socket.id} joined room: restaurant`);
    });

    socket.on('join:kitchen', () => {
      socket.join('kitchen');
      console.log(`[Socket] ${socket.id} joined room: kitchen`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
