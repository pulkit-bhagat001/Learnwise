import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subjectsTable, topicsTable, pomodoroSessionsTable, attendanceRecordsTable, attendanceGoalsTable } from "@workspace/db";
import { eq, and, count, sum } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.use(requireAuth);

async function getSubjectStats(userId: number, subjectId: number) {
  const topics = await db.select().from(topicsTable).where(and(eq(topicsTable.subjectId, subjectId), eq(topicsTable.userId, userId)));
  const sessions = await db.select({ total: sum(pomodoroSessionsTable.durationMinutes) }).from(pomodoroSessionsTable).where(and(eq(pomodoroSessionsTable.subjectId, subjectId), eq(pomodoroSessionsTable.userId, userId)));
  const attendance = await db.select().from(attendanceRecordsTable).where(and(eq(attendanceRecordsTable.subjectId, subjectId), eq(attendanceRecordsTable.userId, userId)));

  const totalMinutes = Number(sessions[0]?.total) || 0;
  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const attendancePercent = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;
  const completedTopics = topics.filter((t) => t.status === "completed").length;

  const performanceScore = Math.round(
    attendancePercent * 0.4 + 
    (topics.length > 0 ? (completedTopics / topics.length) * 100 : 0) * 0.6
  );

  return {
    topicCount: topics.length,
    completedTopics,
    totalStudyMinutes: totalMinutes,
    attendancePercent: Math.round(attendancePercent),
    performanceScore,
  };
}

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.userId, userId));

    const enriched = await Promise.all(
      subjects.map(async (s) => {
        const stats = await getSubjectStats(userId, s.id);
        return { ...s, ...stats };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("Get subjects error:", err);
    res.status(500).json({ error: "Failed to get subjects" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, color, icon, description } = req.body;

    if (!name) {
      res.status(400).json({ error: "Subject name is required" });
      return;
    }

    const [subject] = await db
      .insert(subjectsTable)
      .values({
        userId,
        name,
        color: color || "#6366f1",
        icon: icon || null,
        description: description || null,
      })
      .returning();

    res.status(201).json({ ...subject, topicCount: 0, completedTopics: 0, totalStudyMinutes: 0, attendancePercent: 100, performanceScore: 0 });
  } catch (err) {
    console.error("Create subject error:", err);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

router.get("/:subjectId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = parseInt(req.params.subjectId);

    const [subject] = await db.select().from(subjectsTable).where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId))).limit(1);

    if (!subject) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }

    const topics = await db.select().from(topicsTable).where(and(eq(topicsTable.subjectId, subjectId), eq(topicsTable.userId, userId)));

    const enrichedTopics = await Promise.all(
      topics.map(async (t) => {
        const sessions = await db
          .select({ total: sum(pomodoroSessionsTable.durationMinutes) })
          .from(pomodoroSessionsTable)
          .where(and(eq(pomodoroSessionsTable.topicId, t.id), eq(pomodoroSessionsTable.userId, userId)));

        return { ...t, studyMinutes: Number(sessions[0]?.total) || 0, materialCount: 0 };
      })
    );

    const stats = await getSubjectStats(userId, subjectId);

    res.json({ ...subject, ...stats, topics: enrichedTopics });
  } catch (err) {
    console.error("Get subject error:", err);
    res.status(500).json({ error: "Failed to get subject" });
  }
});

router.put("/:subjectId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = parseInt(req.params.subjectId);
    const { name, color, icon, description } = req.body;

    const [subject] = await db
      .update(subjectsTable)
      .set({ name, color, icon, description })
      .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)))
      .returning();

    if (!subject) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }

    const stats = await getSubjectStats(userId, subjectId);
    res.json({ ...subject, ...stats });
  } catch (err) {
    console.error("Update subject error:", err);
    res.status(500).json({ error: "Failed to update subject" });
  }
});

router.delete("/:subjectId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = parseInt(req.params.subjectId);

    await db.delete(subjectsTable).where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)));

    res.json({ message: "Subject deleted" });
  } catch (err) {
    console.error("Delete subject error:", err);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

router.get("/:subjectId/topics", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = parseInt(req.params.subjectId);

    const topics = await db.select().from(topicsTable).where(and(eq(topicsTable.subjectId, subjectId), eq(topicsTable.userId, userId)));

    const enriched = await Promise.all(
      topics.map(async (t) => {
        const sessions = await db
          .select({ total: sum(pomodoroSessionsTable.durationMinutes) })
          .from(pomodoroSessionsTable)
          .where(and(eq(pomodoroSessionsTable.topicId, t.id), eq(pomodoroSessionsTable.userId, userId)));

        return { ...t, studyMinutes: Number(sessions[0]?.total) || 0, materialCount: 0 };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("Get topics error:", err);
    res.status(500).json({ error: "Failed to get topics" });
  }
});

router.post("/:subjectId/topics", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = parseInt(req.params.subjectId);
    const { name, description, difficulty } = req.body;

    if (!name) {
      res.status(400).json({ error: "Topic name is required" });
      return;
    }

    const [topic] = await db
      .insert(topicsTable)
      .values({
        userId,
        subjectId,
        name,
        description: description || null,
        difficulty: difficulty || "medium",
        status: "not_started",
      })
      .returning();

    res.status(201).json({ ...topic, studyMinutes: 0, materialCount: 0 });
  } catch (err) {
    console.error("Create topic error:", err);
    res.status(500).json({ error: "Failed to create topic" });
  }
});

router.put("/:subjectId/topics/:topicId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const topicId = parseInt(req.params.topicId);
    const { name, description, difficulty, status } = req.body;

    const [topic] = await db
      .update(topicsTable)
      .set({ name, description, difficulty, status })
      .where(and(eq(topicsTable.id, topicId), eq(topicsTable.userId, userId)))
      .returning();

    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json({ ...topic, studyMinutes: 0, materialCount: 0 });
  } catch (err) {
    console.error("Update topic error:", err);
    res.status(500).json({ error: "Failed to update topic" });
  }
});

router.delete("/:subjectId/topics/:topicId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const topicId = parseInt(req.params.topicId);

    await db.delete(topicsTable).where(and(eq(topicsTable.id, topicId), eq(topicsTable.userId, userId)));

    res.json({ message: "Topic deleted" });
  } catch (err) {
    console.error("Delete topic error:", err);
    res.status(500).json({ error: "Failed to delete topic" });
  }
});

export default router;
