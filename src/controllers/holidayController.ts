import type { Request, Response } from "express";
import Holiday from "../model/Holiday.js";
import { auditLog } from "../utils/auditLogger.js";

// ── GET all holidays (optionally filter by year) ──────────────────────────────
export const getHolidays = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const query: any = {};

    if (year) {
      const y = parseInt(year as string);
      query.date = {
        $gte: new Date(`${y}-01-01`),
        $lte: new Date(`${y}-12-31T23:59:59.999Z`),
      };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 }).lean();

    res.json({ success: true, holidays, total: holidays.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE holiday ────────────────────────────────────────────────────────────
export const createHoliday = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, date, type, description, isRecurring } = req.body;

    if (!name?.trim() || !date) {
      return res.status(400).json({ success: false, message: "Name and date are required" });
    }

    // Duplicate check — same name + same date
    const existing = await Holiday.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      date: new Date(date),
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "Holiday already exists on this date" });
    }

    const holiday = await Holiday.create({
      name:        name.trim(),
      date:        new Date(date),
      type:        type || "national",
      description: description?.trim(),
      isRecurring: isRecurring !== false,
      createdBy: { id: user.id, name: user.name || "Admin", role: user.role },
    });

    res.status(201).json({ success: true, holiday });

    await auditLog(req, {
      action:   "HOLIDAY_CREATE",
      resource: "Holiday Calendar",
      details:  `Holiday "${name}" added on ${new Date(date).toLocaleDateString("en-IN")}`,
      severity: "INFO",
      status:   "SUCCESS",
      meta:     { holidayId: holiday._id, date, type },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE holiday ────────────────────────────────────────────────────────────
export const updateHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, date, type, description, isRecurring } = req.body;

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { $set: { name, date: date ? new Date(date) : undefined, type, description, isRecurring } },
      { new: true, runValidators: true }
    );

    if (!holiday) return res.status(404).json({ success: false, message: "Holiday not found" });

    res.json({ success: true, holiday });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE holiday ────────────────────────────────────────────────────────────
export const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) return res.status(404).json({ success: false, message: "Holiday not found" });

    res.json({ success: true, message: "Holiday deleted" });

    await auditLog(req, {
      action:   "HOLIDAY_DELETE",
      resource: "Holiday Calendar",
      details:  `Holiday "${holiday.name}" deleted`,
      severity: "WARNING",
      status:   "SUCCESS",
      meta:     { holidayId: id },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
