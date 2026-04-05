import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studyMaterialsTable = pgTable("study_materials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  topicId: integer("topic_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("notes"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  flashcards: jsonb("flashcards"),
  summary: text("summary"),
  shortAnswerQuestions: jsonb("short_answer_questions"),
  mcqs: jsonb("mcqs"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudyMaterialSchema = createInsertSchema(studyMaterialsTable).omit({ id: true, createdAt: true });
export type InsertStudyMaterial = z.infer<typeof insertStudyMaterialSchema>;
export type StudyMaterial = typeof studyMaterialsTable.$inferSelect;
