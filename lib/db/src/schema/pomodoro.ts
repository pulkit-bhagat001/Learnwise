import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pomodoroSessionsTable = pgTable("pomodoro_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id"),
  topicId: integer("topic_id"),
  durationMinutes: integer("duration_minutes").notNull(),
  breakMinutes: integer("break_minutes").notNull(),
  completedPomodoros: integer("completed_pomodoros").notNull(),
  notes: text("notes"),
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPomodoroSessionSchema = createInsertSchema(pomodoroSessionsTable).omit({ id: true, createdAt: true });
export type InsertPomodoroSession = z.infer<typeof insertPomodoroSessionSchema>;
export type PomodoroSession = typeof pomodoroSessionsTable.$inferSelect;
