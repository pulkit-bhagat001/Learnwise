import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  subjectsTable,
  topicsTable,
  pomodoroSessionsTable,
  assignmentsTable,
  attendanceRecordsTable,
  badgesTable,
  pointsEventsTable,
} from "@workspace/db";
import { eq, and, gte, sum } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.use(requireAuth);

const MOTIVATIONAL_TIPS = [
  "Every expert was once a beginner. Keep going!",
  "Small daily improvements lead to stunning results.",
  "The secret to success is to study a little every day.",
  "Don't count the days, make the days count.",
  "Your only limit is the one you set yourself.",
  "Success is the sum of small efforts repeated daily.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Believe in yourself and all that you are.",
];

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [allSessions, weeklySessions, subjects, allAssignments, attendance, badges, recentEvents] = await Promise.all([
      db.select({ total: sum(pomodoroSessionsTable.durationMinutes), count: sum(pomodoroSessionsTable.completedPomodoros) }).from(pomodoroSessionsTable).where(eq(pomodoroSessionsTable.userId, userId)),
      db.select({ total: sum(pomodoroSessionsTable.durationMinutes) }).from(pomodoroSessionsTable).where(and(eq(pomodoroSessionsTable.userId, userId), gte(pomodoroSessionsTable.date, sevenDaysAgo))),
      db.select().from(subjectsTable).where(eq(subjectsTable.userId, userId)),
      db.select().from(assignmentsTable).where(eq(assignmentsTable.userId, userId)),
      db.select().from(attendanceRecordsTable).where(and(eq(attendanceRecordsTable.userId, userId), gte(attendanceRecordsTable.createdAt, thirtyDaysAgo))),
      db.select().from(badgesTable).where(eq(badgesTable.userId, userId)),
      db.select().from(pointsEventsTable).where(eq(pointsEventsTable.userId, userId)),
    ]);

    const totalMinutes = Number(allSessions[0]?.total) || 0;
    const totalStudyHours = Math.round((totalMinutes / 60) * 10) / 10;
    const weeklyMinutes = Number(weeklySessions[0]?.total) || 0;
    const weeklyStudyHours = Math.round((weeklyMinutes / 60) * 10) / 10;
    const completedPomodoros = Number(allSessions[0]?.count) || 0;

    const now = new Date();
    const completedAssignments = allAssignments.filter((a) => a.status === "completed").length;
    const overdueAssignments = allAssignments.filter((a) => (a.status === "pending" || a.status === "in_progress") && new Date(a.dueDate) < now).length;
    const pendingAssignments = allAssignments.filter((a) => (a.status === "pending" || a.status === "in_progress") && new Date(a.dueDate) >= now).length;

    const totalAttendance = attendance.length;
    const presentAttendance = attendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 100;

    const subjectStats = await Promise.all(
      subjects.map(async (s) => {
        const sessions = await db.select({ total: sum(pomodoroSessionsTable.durationMinutes) }).from(pomodoroSessionsTable).where(and(eq(pomodoroSessionsTable.subjectId, s.id), eq(pomodoroSessionsTable.userId, userId)));
        const subjectAttendance = await db.select().from(attendanceRecordsTable).where(and(eq(attendanceRecordsTable.subjectId, s.id), eq(attendanceRecordsTable.userId, userId)));
        const topics = await db.select().from(topicsTable).where(and(eq(topicsTable.subjectId, s.id), eq(topicsTable.userId, userId)));

        const minutes = Number(sessions[0]?.total) || 0;
        const total = subjectAttendance.length;
        const present = subjectAttendance.filter((a) => a.status === "present").length;
        const attPct = total > 0 ? Math.round((present / total) * 100) : 100;
        const completedTopics = topics.filter((t) => t.status === "completed").length;
        const perfScore = Math.round(attPct * 0.4 + (topics.length > 0 ? (completedTopics / topics.length) * 100 : 50) * 0.6);

        return {
          subjectId: s.id,
          subjectName: s.name,
          color: s.color,
          studyMinutes: minutes,
          attendancePercent: attPct,
          performanceScore: perfScore,
          completedTopics,
          totalTopics: topics.length,
        };
      })
    );

    const weakSubjects = subjectStats.filter((s) => s.performanceScore < 60).map((s) => s.subjectName);
    const strongSubjects = subjectStats.filter((s) => s.performanceScore >= 80).map((s) => s.subjectName);

    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6 - i) * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      return { date: dateStr, studyMinutes: 0, completedTasks: 0 };
    });

    const level = user.level;
    const totalPoints = user.totalPoints;
    const levelProgress = ((totalPoints % 500) / 500) * 100;

    const recommendations = [];
    if (weakSubjects.length > 0) recommendations.push(`Focus more on ${weakSubjects.slice(0, 2).join(", ")} — these need attention.`);
    if (attendancePercent < 75) recommendations.push("Your attendance is below 75%. Try to attend more classes.");
    if (overdueAssignments > 0) recommendations.push(`You have ${overdueAssignments} overdue assignment(s). Complete them ASAP.`);
    if (user.streak < 3) recommendations.push("Build a study streak by studying every day!");
    if (weeklyStudyHours < 5) recommendations.push("Aim for at least 5 hours of study per week for better results.");

    const todayPlan = [];
    if (pendingAssignments > 0) todayPlan.push(`Complete ${pendingAssignments} pending assignment(s)`);
    if (weakSubjects.length > 0) todayPlan.push(`Study ${weakSubjects[0]} (needs improvement)`);
    todayPlan.push("Complete a 25-minute Pomodoro session");
    if (attendancePercent < 80) todayPlan.push("Attend all scheduled classes today");

    const motivationalTip = MOTIVATIONAL_TIPS[Math.floor(Math.random() * MOTIVATIONAL_TIPS.length)];

    const recentActivities = recentEvents.slice(-10).reverse().map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      points: e.points,
      createdAt: e.createdAt,
    }));

    res.json({
      totalStudyHours,
      weeklyStudyHours,
      totalPoints,
      currentStreak: user.streak,
      longestStreak: user.longestStreak,
      level,
      levelProgress,
      attendancePercent,
      completedAssignments,
      pendingAssignments,
      overdueAssignments,
      completedPomodoros,
      subjectStats,
      weeklyActivity,
      weakSubjects,
      strongSubjects,
      recommendations,
      motivationalTip,
      todayPlan,
      upcomingExams: [],
      badges: badges.map((b) => ({
        id: b.badgeId,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        earnedAt: b.earnedAt,
      })),
      recentActivities,
    });
  } catch (err) {
    console.error("Get dashboard error:", err);
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
});

export default router;
