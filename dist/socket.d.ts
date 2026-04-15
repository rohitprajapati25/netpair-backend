import { Server } from 'socket.io';
import http from 'http';
declare let io: Server | undefined;
export declare const initSocket: (server: http.Server) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const emitEmployeeUpdate: (data: any) => void;
export declare const emitEmployeeDelete: (employeeId: string) => void;
export default io;
//# sourceMappingURL=socket.d.ts.map