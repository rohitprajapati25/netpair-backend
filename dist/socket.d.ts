/**
 * socket.ts — Socket.io with Redis Adapter for multi-worker broadcasting
 *
 * In a clustered setup each worker runs its own Socket.io instance.
 * Without a shared adapter, events emitted in Worker A won't reach
 * clients connected to Worker B.  The Redis adapter solves this by
 * using Redis pub/sub as the message bus between workers.
 *
 * Redis adapter is optional — if REDIS_URL is not set the server falls
 * back to the default in-memory adapter (fine for single-worker / dev).
 */
import { Server } from 'socket.io';
import http from 'http';
declare let io: Server | undefined;
export declare const initSocket: (server: http.Server) => Promise<Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>>;
export declare const emitEmployeeUpdate: (data: any) => void;
export declare const emitEmployeeDelete: (employeeId: string) => void;
/** Send a notification to a specific user (works across workers via Redis) */
export declare const emitToUser: (userId: string, event: string, data: any) => void;
export declare const getIO: () => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any> | undefined;
export default io;
//# sourceMappingURL=socket.d.ts.map