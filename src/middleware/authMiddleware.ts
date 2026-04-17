import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import HR from "../model/HR.js";
import Admin from "../model/Admin.js";

// ── In-process JWT payload cache ─────────────────────────────────────────────
// Avoids a DB round-trip on every request for recently-seen tokens.
// TTL matches the JWT expiry window (default 15 min).
// In a clustered setup each worker has its own cache — that's fine since
// the cache is just a performance hint, not a source of truth.
const TOKEN_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedUser {
  id: string;
  role: string;
  status: string;
  email: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedUser>();

// Periodically evict expired entries to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokenCache) {
    if (now > val.expiresAt) tokenCache.delete(key);
  }
}, 5 * 60 * 1000); // sweep every 5 minutes

export const protect = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const role = (decoded.role || "employee").toLowerCase().trim();

    // ── Cache hit: skip DB query ──────────────────────────────────────────────
    const cached = tokenCache.get(token);
    if (cached && Date.now() < cached.expiresAt) {
      req.user = { id: cached.id, role: cached.role, status: cached.status, email: cached.email };
      return next();
    }

    // ── Cache miss: single targeted DB query (lean for speed) ────────────────
    // All users live in the User collection (dual-save on creation).
    // Fall back to role-specific collection only for legacy records.
    let user = await User.findById(decoded.id)
      .select("status role email name")
      .lean();

    if (!user) {
      // Fallback: legacy role-specific collections (cast to any — different schemas)
      if (role === "employee") {
        user = (await Employee.findById(decoded.id).select("status role email name").lean()) as any;
      } else if (role === "hr") {
        user = (await HR.findById(decoded.id).select("status role email name").lean()) as any;
      } else if (role === "admin") {
        user = (await Admin.findById(decoded.id).select("status role email name").lean()) as any;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const normalizedStatus = (user as any).status?.toString().toLowerCase().trim() || "inactive";

    if (normalizedStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: `Account is ${normalizedStatus}. Contact admin to activate.`,
      });
    }

    const userPayload = {
      id:     String((user as any)._id),
      role:   ((user as any).role || role).toLowerCase().trim(),
      status: normalizedStatus,
      email:  (user as any).email,
    };

    // ── Populate cache ────────────────────────────────────────────────────────
    tokenCache.set(token, { ...userPayload, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });

    req.user = userPayload;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      tokenCache.delete(token ?? "");
      return res.status(401).json({ success: false, message: "Token expired. Please login again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
