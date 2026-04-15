import type { Request } from "express";
export interface AuditPayload {
    action: string;
    resource: string;
    details: string;
    severity?: "INFO" | "MEDIUM" | "WARNING" | "HIGH";
    status?: "SUCCESS" | "FAILED";
    meta?: Record<string, any>;
}
/**
 * Write one audit log entry.
 * Call this from any controller — never throws, so it won't break the main flow.
 */
export declare const auditLog: (req: Request, payload: AuditPayload) => Promise<void>;
export declare const auditLoginLog: (req: Request, user: {
    id: string;
    name: string;
    role: string;
    email: string;
}, success: boolean, details: string) => Promise<void>;
//# sourceMappingURL=auditLogger.d.ts.map