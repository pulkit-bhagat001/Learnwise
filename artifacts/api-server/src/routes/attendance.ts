import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { attendanceRecordsTable, attendanceGoalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { awardPoints, deductPoints } from "../lib/points.js";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;

    const records = await db
      .select()
      .from(attendanceRecordsTable)
      .where(
        and(
          eq(attendanceRecordsTable.userId, userId),
          subjectId ? eq(attendanceRecordsTable.subjectId, subjectId) : undefined
        )
      );

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "present").length;
    const absentDays = records.filter((r) => r.status === "absent").length;
    const lateDays = records.filter((r) => r.status === "late").length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    res.json({
      records,
      stats: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        percentage,
      },
    });
  } catch (err) {
    console.error("Get attendance error:", err);
    res.status(500).json({ error: "Failed to get attendance" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, date, status, notes } = req.body;

    if (!subjectId || !date || !status) {
      res.status(400).json({ error: "Subject ID, date and status are required" });
      return;
    }

    const existing = await db
      .select()
      .from(attendanceRecordsTable)
      .where(and(eq(attendanceRecordsTable.userId, userId), eq(attendanceRecordsTable.subjectId, subjectId), eq(attendanceRecordsTable.date, date)))
      .limit(1);

    let record;
    if (existing.length > 0) {
      const [updated] = await db
        .update(attendanceRecordsTable)
        .set({ status, notes: notes || null })
        .where(eq(attendanceRecordsTable.id, existing[0].id))
        .returning();
      record = updated;
    } else {
      const [created] = await db
        .insert(attendanceRecordsTable)
        .values({
          userId,
          subjectId,
          date,
          status,
          notes: notes || null,
        })
        .returning();
      record = created;

      if (status === "present") {
        await awardPoints(userId, "attendance", `Present for class on ${date}`, 10);
      } else if (status === "absent") {
        await deductPoints(userId, "attendance_absent", `Absent on ${date}`, 5);
      } else if (status === "late") {
        await awardPoints(userId, "attendance", `Late attendance on ${date}`, 3);
      }
    }

    res.status(201).json(record);
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

router.get("/goals", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const goals = await db.select().from(attendanceGoalsTable).where(eq(attendanceGoalsTable.userId, userId));

    const enriched = await Promise.all(
      goals.map(async (g) => {
        const records = await db.select().from(attendanceRecordsTable).where(and(eq(attendanceRecordsTable.userId, userId), eq(attendanceRecordsTable.subjectId, g.subjectId)));

        const total = records.length;
        const present = records.filter((r) => r.status === "present").length;
        const currentPercent = total > 0 ? Math.round((present / total) * 100) : 100;

        return { ...g, currentPercent };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("Get attendance goals error:", err);
    res.status(500).json({ error: "Failed to get attendance goals" });
  }
});

router.post("/goals", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, targetPercent, penaltyThreshold } = req.body;

    if (!subjectId || !targetPercent || !penaltyThreshold) {
      res.status(400).json({ error: "Subject ID, target percent and penalty threshold are required" });
      return;
    }

    const existing = await db.select().from(attendanceGoalsTable).where(and(eq(attendanceGoalsTable.userId, userId), eq(attendanceGoalsTable.subjectId, subjectId))).limit(1);

    let goal;
    if (existing.length > 0) {
      const [updated] = await db
        .update(attendanceGoalsTable)
        .set({ targetPercent, penaltyThreshold })
        .where(eq(attendanceGoalsTable.id, existing[0].id))
        .returning();
      goal = updated;
    } else {
      const [created] = await db
        .insert(attendanceGoalsTable)
        .values({ userId, subjectId, targetPercent, penaltyThreshold })
        .returning();
      goal = created;
    }

    const records = await db.select().from(attendanceRecordsTable).where(and(eq(attendanceRecordsTable.userId, userId), eq(attendanceRecordsTable.subjectId, subjectId)));

    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const currentPercent = total > 0 ? Math.round((present / total) * 100) : 100;

    res.json({ ...goal, currentPercent });
  } catch (err) {
    console.error("Set attendance goal error:", err);
    res.status(500).json({ error: "Failed to set attendance goal" });
  }
});

export default router;
