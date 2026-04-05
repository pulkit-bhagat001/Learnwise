import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { studyPlansTable, subjectsTable, topicsTable, assignmentsTable, attendanceRecordsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.use(requireAuth);

router.post("/generate", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { planType, subjectId, topicId, examDate, availableHoursPerDay, targetDate, notes } = req.body;

    if (!planType || !availableHoursPerDay) {
      res.status(400).json({ error: "Plan type and available hours per day are required" });
      return;
    }

    let subjectName = "General Study";
    let topicName = "";

    if (subjectId) {
      const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId)).limit(1);
      if (subject) subjectName = subject.name;
    }
    if (topicId) {
      const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, topicId)).limit(1);
      if (topic) topicName = topic.name;
    }

    const pendingAssignments = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.userId, userId), eq(assignmentsTable.status, "pending")));

    const today = new Date().toISOString().split("T")[0];
    const endDate = examDate || targetDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(today).getTime()) / 86400000);
    const planDays = Math.max(1, Math.min(daysDiff, 30));

    const prompt = `Create a personalized study plan for a student with these details:
- Plan Type: ${planType}
- Subject: ${subjectName}${topicName ? ` - Topic: ${topicName}` : ""}
- Available study hours per day: ${availableHoursPerDay}
- Plan duration: ${planDays} days (from ${today} to ${endDate})
- Pending assignments: ${pendingAssignments.length}
- Extra notes: ${notes || "None"}

Generate a realistic, day-by-day study plan. Return ONLY valid JSON:
{
  "title": "plan title",
  "dailyTasks": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "tasks": ["specific task 1", "specific task 2"],
      "focusTopics": ["topic 1"],
      "estimatedMinutes": 90
    }
  ],
  "tips": ["study tip 1", "study tip 2", "study tip 3"],
  "motivationalMessage": "encouraging message for the student"
}

Make tasks specific, achievable, and progressive. Include review sessions and breaks.`;

    let planData;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are an expert educational AI that creates personalized study plans. Return ONLY valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });

      const text = response.choices[0]?.message?.content || "{}";
      planData = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    } catch (aiErr) {
      console.error("AI plan generation failed:", aiErr);
      planData = {
        title: `${planType} Study Plan for ${subjectName}`,
        dailyTasks: Array.from({ length: planDays }, (_, i) => ({
          day: i + 1,
          date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
          tasks: [`Study ${subjectName} - Session ${i + 1}`, "Review previous notes", "Practice questions"],
          focusTopics: [subjectName],
          estimatedMinutes: Math.round(availableHoursPerDay * 60 * 0.8),
        })),
        tips: ["Take regular breaks using the Pomodoro technique", "Review notes within 24 hours", "Test yourself regularly"],
        motivationalMessage: "You've got this! Consistent daily effort leads to mastery.",
      };
    }

    const [plan] = await db
      .insert(studyPlansTable)
      .values({
        userId,
        planType,
        title: planData.title || `Study Plan for ${subjectName}`,
        subjectId: subjectId || null,
        topicId: topicId || null,
        examDate: examDate || null,
        availableHoursPerDay,
        dailyTasks: planData.dailyTasks || [],
        tips: planData.tips || [],
        motivationalMessage: planData.motivationalMessage || null,
      })
      .returning();

    res.json(plan);
  } catch (err) {
    console.error("Generate study plan error:", err);
    res.status(500).json({ error: "Failed to generate study plan" });
  }
});

router.get("/plans", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const plans = await db.select().from(studyPlansTable).where(eq(studyPlansTable.userId, userId));
    res.json(plans);
  } catch (err) {
    console.error("Get study plans error:", err);
    res.status(500).json({ error: "Failed to get study plans" });
  }
});

export default router;
