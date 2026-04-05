import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { assignmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { awardPoints, deductPoints } from "../lib/points.js";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const statusFilter = req.query.status as string | undefined;

    const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.userId, userId));

    const now = new Date();
    const enriched = assignments.map((a) => {
      let status = a.status;
      if (status === "pending" || status === "in_progress") {
        if (new Date(a.dueDate) < now) {
          status = "overdue";
        }
      }
      return { ...a, status };
    });

    const filtered = statusFilter ? enriched.filter((a) => a.status === statusFilter) : enriched;
    res.json(filtered);
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ error: "Failed to get assignments" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { title, description, subjectId, topicId, dueDate, priority } = req.body;

    if (!title || !dueDate || !priority) {
      res.status(400).json({ error: "Title, due date and priority are required" });
      return;
    }

    const [assignment] = await db
      .insert(assignmentsTable)
      .values({
        userId,
        title,
        description: description || null,
        subjectId: subjectId || null,
        topicId: topicId || null,
        dueDate: new Date(dueDate),
        priority,
        status: "pending",
        lateCompletion: false,
      })
      .returning();

    res.status(201).json(assignment);
  } catch (err) {
    console.error("Create assignment error:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

router.put("/:assignmentId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const assignmentId = parseInt(req.params.assignmentId);
    const { title, description, subjectId, topicId, dueDate, status, priority } = req.body;

    const [existing] = await db.select().from(assignmentsTable).where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.userId, userId))).limit(1);

    if (!existing) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    let completedAt = existing.completedAt;
    let lateCompletion = existing.lateCompletion;

    if (status === "completed" && existing.status !== "completed") {
      completedAt = new Date();
      lateCompletion = completedAt > new Date(existing.dueDate);

      if (lateCompletion) {
        await deductPoints(userId, "assignment_late", `Late completion: ${existing.title}`, 10);
      } else {
        const priorityPoints: Record<string, number> = { low: 15, medium: 25, high: 40, urgent: 60 };
        await awardPoints(userId, "assignment", `Completed: ${existing.title}`, priorityPoints[existing.priority] || 25);
      }
    }

    const [assignment] = await db
      .update(assignmentsTable)
      .set({
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        subjectId: subjectId !== undefined ? subjectId : undefined,
        topicId: topicId !== undefined ? topicId : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status || undefined,
        priority: priority || undefined,
        completedAt,
        lateCompletion,
      })
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.userId, userId)))
      .returning();

    res.json(assignment);
  } catch (err) {
    console.error("Update assignment error:", err);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

router.delete("/:assignmentId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const assignmentId = parseInt(req.params.assignmentId);

    await db.delete(assignmentsTable).where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.userId, userId)));

    res.json({ message: "Assignment deleted" });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

export default router;
