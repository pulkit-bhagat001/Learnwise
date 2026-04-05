import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pomodoroSessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { awardPoints, updateStreak } from "../lib/points.js";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/sessions", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : undefined;

    const sessions = await db
      .select()
      .from(pomodoroSessionsTable)
      .where(
        and(
          eq(pomodoroSessionsTable.userId, userId),
          subjectId ? eq(pomodoroSessionsTable.subjectId, subjectId) : undefined,
          topicId ? eq(pomodoroSessionsTable.topicId, topicId) : undefined
        )
      );

    res.json(sessions);
  } catch (err) {
    console.error("Get pomodoro sessions error:", err);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, topicId, durationMinutes, breakMinutes, completedPomodoros, notes } = req.body;

    if (durationMinutes === undefined || breakMinutes === undefined || completedPomodoros === undefined) {
      res.status(400).json({ error: "Duration, break minutes and completed pomodoros are required" });
      return;
    }

    const [session] = await db
      .insert(pomodoroSessionsTable)
      .values({
        userId,
        subjectId: subjectId || null,
        topicId: topicId || null,
        durationMinutes,
        breakMinutes,
        completedPomodoros,
        notes: notes || null,
        date: new Date(),
      })
      .returning();

    await updateStreak(userId);

    const points = completedPomodoros * 20;
    if (points > 0) {
      await awardPoints(userId, "study", `Completed ${completedPomodoros} Pomodoro session(s)`, points);
    }

    res.status(201).json(session);
  } catch (err) {
    console.error("Create pomodoro session error:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

export default router;
