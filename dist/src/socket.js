import { Server } from 'socket.io';
let io;
export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"]
        }
    });
    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id);
        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });
    return io;
};
export const emitEmployeeUpdate = (data) => {
    if (io) {
        io.emit('employeeUpdate', data);
    }
};
export const emitEmployeeDelete = (employeeId) => {
    if (io) {
        io.emit('employeeDelete', { id: employeeId });
    }
};
export default io;
//# sourceMappingURL=socket.js.map