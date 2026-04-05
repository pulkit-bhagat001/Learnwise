import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceRecordsTable = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attendanceGoalsTable = pgTable("attendance_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id").notNull().unique(),
  targetPercent: real("target_percent").notNull().default(75),
  penaltyThreshold: real("penalty_threshold").notNull().default(65),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecordsTable).omit({ id: true, createdAt: true });
export const insertAttendanceGoalSchema = createInsertSchema(attendanceGoalsTable).omit({ id: true, createdAt: true });
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
export type AttendanceGoal = typeof attendanceGoalsTable.$inferSelect;
