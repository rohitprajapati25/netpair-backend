import AuditLog from "../model/AuditLog.js";
// ── IP extractor ──────────────────────────────────────────────────────────────
const getClientIP = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
        if (first) {
            const clean = first.trim().replace(/^::ffff:/, "");
            if (clean)
                return clean;
        }
    }
    const ip = req.ip || req.socket?.remoteAddress || "";
    if (ip.startsWith("::ffff:"))
        return ip.replace("::ffff:", "");
    if (ip === "::1" || ip === "127.0.0.1")
        return "127.0.0.1 (localhost)";
    return ip || "—";
};
// ── Device parser — reads User-Agent string ───────────────────────────────────
const parseDevice = (ua = "") => {
    if (!ua || ua === "—") {
        return { name: "Unknown Device", os: "Unknown OS", browser: "Unknown Browser", type: "Desktop" };
    }
    // ── OS detection ────────────────────────────────────────────────────────────
    let os = "Unknown OS";
    if (/Windows NT 10/i.test(ua))
        os = "Windows 10/11";
    else if (/Windows NT 6\.3/i.test(ua))
        os = "Windows 8.1";
    else if (/Windows NT 6\.1/i.test(ua))
        os = "Windows 7";
    else if (/Windows/i.test(ua))
        os = "Windows";
    else if (/iPhone OS ([\d_]+)/i.test(ua)) {
        const v = ua.match(/iPhone OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "";
        os = `iOS ${v}`;
    }
    else if (/iPad.*OS ([\d_]+)/i.test(ua)) {
        const v = ua.match(/iPad.*OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "";
        os = `iPadOS ${v}`;
    }
    else if (/Android ([\d.]+)/i.test(ua)) {
        const v = ua.match(/Android ([\d.]+)/i)?.[1] || "";
        os = `Android ${v}`;
    }
    else if (/Mac OS X ([\d_]+)/i.test(ua)) {
        const v = ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "";
        os = `macOS ${v}`;
    }
    else if (/Linux/i.test(ua))
        os = "Linux";
    else if (/CrOS/i.test(ua))
        os = "ChromeOS";
    // ── Browser detection ────────────────────────────────────────────────────────
    let browser = "Unknown Browser";
    if (/Edg\/([\d.]+)/i.test(ua)) {
        const v = ua.match(/Edg\/([\d.]+)/i)?.[1]?.split(".")[0] || "";
        browser = `Edge ${v}`;
    }
    else if (/OPR\/([\d.]+)/i.test(ua) || /Opera\/([\d.]+)/i.test(ua)) {
        const v = (ua.match(/OPR\/([\d.]+)/i) || ua.match(/Opera\/([\d.]+)/i))?.[1]?.split(".")[0] || "";
        browser = `Opera ${v}`;
    }
    else if (/Chrome\/([\d.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
        const v = ua.match(/Chrome\/([\d.]+)/i)?.[1]?.split(".")[0] || "";
        browser = `Chrome ${v}`;
    }
    else if (/Firefox\/([\d.]+)/i.test(ua)) {
        const v = ua.match(/Firefox\/([\d.]+)/i)?.[1]?.split(".")[0] || "";
        browser = `Firefox ${v}`;
    }
    else if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
        const v = ua.match(/Version\/([\d.]+)/i)?.[1]?.split(".")[0] || "";
        browser = `Safari ${v}`;
    }
    else if (/MSIE|Trident/i.test(ua))
        browser = "Internet Explorer";
    else if (/Postman/i.test(ua))
        browser = "Postman";
    else if (/curl/i.test(ua))
        browser = "cURL";
    else if (/axios/i.test(ua))
        browser = "Axios (API)";
    // ── Device type ──────────────────────────────────────────────────────────────
    let type = "Desktop";
    if (/Mobile|Android.*Mobile|iPhone/i.test(ua))
        type = "Mobile";
    else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua))
        type = "Tablet";
    // ── Device icon name ─────────────────────────────────────────────────────────
    const name = `${browser} on ${os}`;
    return { name, os, browser, type };
};
/**
 * Write one audit log entry.
 * Call this from any controller — never throws, so it won't break the main flow.
 */
export const auditLog = async (req, payload) => {
    try {
        const user = req.user;
        if (!user?.id)
            return;
        const ua = req.headers["user-agent"] || "";
        await AuditLog.create({
            action: payload.action,
            resource: payload.resource,
            details: payload.details,
            severity: payload.severity || "INFO",
            status: payload.status || "SUCCESS",
            meta: payload.meta,
            user: {
                id: user.id,
                name: user.name || "Unknown",
                role: user.role || "unknown",
                email: user.email || "",
            },
            device: parseDevice(ua),
            ipAddress: getClientIP(req),
            userAgent: ua || "—",
        });
    }
    catch (err) {
        console.error("[AuditLog] Failed to write log:", err);
    }
};
export const auditLoginLog = async (req, user, success, details) => {
    try {
        const ua = req.headers["user-agent"] || "";
        await AuditLog.create({
            action: success ? "USER_LOGIN" : "LOGIN_FAILED",
            resource: "Authentication",
            details,
            severity: success ? "INFO" : "WARNING",
            status: success ? "SUCCESS" : "FAILED",
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                email: user.email,
            },
            device: parseDevice(ua),
            ipAddress: getClientIP(req),
            userAgent: ua || "—",
        });
    }
    catch (err) {
        console.error("[AuditLog] Failed to write login log:", err);
    }
};
//# sourceMappingURL=auditLogger.js.map