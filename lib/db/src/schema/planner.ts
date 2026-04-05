import { pgTable, text, serial, integer, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studyPlansTable = pgTable("study_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planType: text("plan_type").notNull(),
  title: text("title").notNull(),
  subjectId: integer("subject_id"),
  topicId: integer("topic_id"),
  examDate: text("exam_date"),
  availableHoursPerDay: real("available_hours_per_day").notNull(),
  dailyTasks: jsonb("daily_tasks").notNull(),
  tips: jsonb("tips").notNull().default([]),
  motivationalMessage: text("motivational_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pointsEventsTable = pgTable("points_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const badgesTable = pgTable("badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  badgeId: text("badge_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const insertStudyPlanSchema = createInsertSchema(studyPlansTable).omit({ id: true, createdAt: true });
export const insertPointsEventSchema = createInsertSchema(pointsEventsTable).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badgesTable).omit({ id: true });
export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;
export type StudyPlan = typeof studyPlansTable.$inferSelect;
export type PointsEvent = typeof pointsEventsTable.$inferSelect;
export type Badge = typeof badgesTable.$inferSelect;
