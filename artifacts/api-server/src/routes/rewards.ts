import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, badgesTable, pointsEventsTable } from "@workspace/db";
import { eq, sum } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.use(requireAuth);

const LEVELS = [
  { level: 1, name: "Beginner", min: 0 },
  { level: 2, name: "Learner", min: 500 },
  { level: 3, name: "Scholar", min: 1000 },
  { level: 4, name: "Academic", min: 2000 },
  { level: 5, name: "Expert", min: 3500 },
  { level: 6, name: "Master", min: 5000 },
  { level: 7, name: "Champion", min: 7500 },
  { level: 8, name: "Legend", min: 10000 },
];

const AVAILABLE_REWARDS = [
  { id: "reward_study_guide", name: "Premium Study Guide", description: "A curated collection of the best study tips and techniques", pointCost: 200, category: "Educational", available: true },
  { id: "reward_break", name: "Guilt-Free Break Day", description: "Take a full study break without penalty to your streak", pointCost: 300, category: "Wellness", available: true },
  { id: "reward_badge_custom", name: "Custom Achievement Badge", description: "Create a custom badge for your profile", pointCost: 500, category: "Profile", available: true },
  { id: "reward_priority", name: "AI Priority Boost", description: "Get priority AI study plan generation for one month", pointCost: 750, category: "Feature", available: true },
  { id: "reward_certificate", name: "Excellence Certificate", description: "A digital certificate of academic excellence", pointCost: 1000, category: "Achievement", available: true },
  { id: "reward_mentoring", name: "Virtual Mentoring Session", description: "Book a virtual AI mentoring session", pointCost: 1500, category: "Premium", available: true },
];

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const badges = await db.select().from(badgesTable).where(eq(badgesTable.userId, userId));
    const events = await db.select().from(pointsEventsTable).where(eq(pointsEventsTable.userId, userId));

    const totalPoints = user.totalPoints;
    const level = user.level;
    const levelInfo = LEVELS.find((l) => l.level === level) || LEVELS[0];
    const nextLevel = LEVELS.find((l) => l.level === level + 1);
    const pointsToNextLevel = nextLevel ? nextLevel.min - totalPoints : 0;
    const levelMin = levelInfo.min;
    const levelMax = nextLevel ? nextLevel.min : levelInfo.min + 2500;
    const levelProgress = Math.min(100, Math.round(((totalPoints - levelMin) / (levelMax - levelMin)) * 100));

    const attendancePoints = events.filter((e) => e.type === "attendance").reduce((a, b) => a + Math.max(0, b.points), 0);
    const studyPoints = events.filter((e) => e.type === "study").reduce((a, b) => a + Math.max(0, b.points), 0);
    const assignmentPoints = events.filter((e) => e.type === "assignment").reduce((a, b) => a + Math.max(0, b.points), 0);
    const streakPoints = events.filter((e) => e.type === "streak").reduce((a, b) => a + Math.max(0, b.points), 0);

    res.json({
      totalPoints,
      level,
      levelName: levelInfo.name,
      pointsToNextLevel: Math.max(0, pointsToNextLevel),
      levelProgress,
      badges: badges.map((b) => ({
        id: b.badgeId,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        earnedAt: b.earnedAt,
      })),
      availableRewards: AVAILABLE_REWARDS.map((r) => ({
        ...r,
        available: totalPoints >= r.pointCost,
      })),
      pointsBreakdown: {
        attendance: attendancePoints,
        study: studyPoints,
        assignments: assignmentPoints,
        streak: streakPoints,
      },
    });
  } catch (err) {
    console.error("Get rewards error:", err);
    res.status(500).json({ error: "Failed to get rewards" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const events = await db.select().from(pointsEventsTable).where(eq(pointsEventsTable.userId, userId));

    res.json(
      events.reverse().map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        points: e.points,
        createdAt: e.createdAt,
      }))
    );
  } catch (err) {
    console.error("Get points history error:", err);
    res.status(500).json({ error: "Failed to get points history" });
  }
});

export default router;
