import { Server, Socket } from 'socket.io';
import http from 'http';

let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('✅ Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
};

export const emitEmployeeUpdate = (data: any) => {
  if (io) {
    io.emit('employeeUpdate', data);
  }
};

export const emitEmployeeDelete = (employeeId: string) => {
  if (io) {
    io.emit('employeeDelete', { id: employeeId });
  }
};

export default io;


