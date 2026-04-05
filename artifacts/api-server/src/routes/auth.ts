import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth.js";
import { awardPoints } from "../lib/points.js";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, grade, school } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email,
        passwordHash,
        grade: grade || null,
        school: school || null,
        totalPoints: 50,
        streak: 0,
        longestStreak: 0,
        level: 1,
      })
      .returning();

    await awardPoints(user.id, "registration", "Welcome bonus for joining!", 50);

    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        grade: user.grade,
        school: user.school,
        avatarUrl: user.avatarUrl,
        totalPoints: user.totalPoints,
        streak: user.streak,
        level: user.level,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        grade: user.grade,
        school: user.school,
        avatarUrl: user.avatarUrl,
        totalPoints: user.totalPoints,
        streak: user.streak,
        level: user.level,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      grade: user.grade,
      school: user.school,
      avatarUrl: user.avatarUrl,
      totalPoints: user.totalPoints,
      streak: user.streak,
      level: user.level,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, grade, school, avatarUrl } = req.body;

    const [user] = await db
      .update(usersTable)
      .set({
        name: name || undefined,
        grade: grade || undefined,
        school: school || undefined,
        avatarUrl: avatarUrl || undefined,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      grade: user.grade,
      school: user.school,
      avatarUrl: user.avatarUrl,
      totalPoints: user.totalPoints,
      streak: user.streak,
      level: user.level,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
