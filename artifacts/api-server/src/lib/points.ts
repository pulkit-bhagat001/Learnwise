import { db } from "@workspace/db";
import { usersTable, pointsEventsTable, badgesTable } from "@workspace/db";
import { eq, and, sum } from "drizzle-orm";

export async function awardPoints(userId: number, type: string, description: string, points: number) {
  if (points === 0) return;

  await db.insert(pointsEventsTable).values({
    userId,
    type,
    description,
    points,
  });

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) return;

  const newTotal = user[0].totalPoints + points;
  const newLevel = Math.floor(newTotal / 500) + 1;

  await db
    .update(usersTable)
    .set({
      totalPoints: newTotal,
      level: newLevel,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  await checkAndAwardBadges(userId, type, newTotal);
}

export async function deductPoints(userId: number, type: string, description: string, points: number) {
  await db.insert(pointsEventsTable).values({
    userId,
    type,
    description,
    points: -points,
  });

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) return;

  const newTotal = Math.max(0, user[0].totalPoints - points);
  const newLevel = Math.floor(newTotal / 500) + 1;

  await db
    .update(usersTable)
    .set({
      totalPoints: newTotal,
      level: newLevel,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));
}

export async function updateStreak(userId: number) {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) return;

  const today = new Date().toISOString().split("T")[0];
  const lastStudy = user[0].lastStudyDate;

  if (lastStudy === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak = lastStudy === yesterday ? user[0].streak + 1 : 1;
  const newLongest = Math.max(user[0].longestStreak, newStreak);

  await db
    .update(usersTable)
    .set({
      streak: newStreak,
      longestStreak: newLongest,
      lastStudyDate: today,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  if (newStreak > user[0].streak) {
    await awardPoints(userId, "streak", `${newStreak}-day study streak!`, Math.min(newStreak * 5, 100));
  }
}

async function checkAndAwardBadges(userId: number, eventType: string, totalPoints: number) {
  const existingBadges = await db.select({ badgeId: badgesTable.badgeId }).from(badgesTable).where(eq(badgesTable.userId, userId));
  const earned = new Set(existingBadges.map((b) => b.badgeId));

  const toAward: Array<{ badgeId: string; name: string; description: string; icon: string; category: string }> = [];

  if (totalPoints >= 100 && !earned.has("points_100")) {
    toAward.push({ badgeId: "points_100", name: "Century", description: "Earned 100 points", icon: "⭐", category: "achievement" });
  }
  if (totalPoints >= 500 && !earned.has("points_500")) {
    toAward.push({ badgeId: "points_500", name: "High Achiever", description: "Earned 500 points", icon: "🏆", category: "achievement" });
  }
  if (totalPoints >= 1000 && !earned.has("points_1000")) {
    toAward.push({ badgeId: "points_1000", name: "Scholar", description: "Earned 1000 points", icon: "🎓", category: "achievement" });
  }
  if (eventType === "study" && !earned.has("first_study")) {
    toAward.push({ badgeId: "first_study", name: "First Session", description: "Completed your first study session", icon: "📚", category: "study" });
  }
  if (eventType === "assignment" && !earned.has("first_assignment")) {
    toAward.push({ badgeId: "first_assignment", name: "Task Master", description: "Completed your first assignment", icon: "✅", category: "assignment" });
  }
  if (eventType === "attendance" && !earned.has("first_attendance")) {
    toAward.push({ badgeId: "first_attendance", name: "Present!", description: "Marked your first attendance", icon: "📅", category: "attendance" });
  }

  for (const badge of toAward) {
    await db.insert(badgesTable).values({
      userId,
      ...badge,
      earnedAt: new Date(),
    });
  }
}
