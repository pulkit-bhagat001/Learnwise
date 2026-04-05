import { Router, type IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { studyMaterialsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|doc|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, Word (.doc/.docx), and text files are allowed"));
    }
  },
});

async function extractTextFromFile(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const name = filename.toLowerCase();

  if (mimetype === "application/pdf" || name.endsWith(".pdf")) {
    const mod = await import("pdf-parse");
    const pdfParse = (mod.default ?? mod) as unknown as (buffer: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    const mod = await import("mammoth");
    const mammoth = (mod.default ?? mod) as unknown as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype === "text/plain" || name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type");
}

async function generateAIContent(title: string, content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are an educational AI assistant. Given study material, generate educational content in JSON format. Return ONLY valid JSON with no markdown.`,
        },
        {
          role: "user",
          content: `Generate educational content for this study material:
Title: ${title}
Content: ${content.slice(0, 4000)}

Return JSON with exactly this structure:
{
  "summary": "A concise 2-3 paragraph summary",
  "flashcards": [{"front": "question or term", "back": "answer or definition"}],
  "shortAnswerQuestions": [{"question": "question text", "answer": "answer text"}],
  "mcqs": [{"question": "question", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "why correct"}]
}

Generate 5-8 flashcards, 3-5 short answer questions, and 3-5 MCQs.`,
        },
      ],
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    return parsed;
  } catch (err) {
    console.error("AI generation error:", err);
    return {
      summary: `Summary of ${title}: ${content.slice(0, 200)}...`,
      flashcards: [{ front: "What is the main topic?", back: title }],
      shortAnswerQuestions: [{ question: "Explain the key concepts.", answer: content.slice(0, 200) }],
      mcqs: [],
    };
  }
}

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : undefined;

    const materials = await db
      .select()
      .from(studyMaterialsTable)
      .where(
        and(
          eq(studyMaterialsTable.userId, userId),
          subjectId ? eq(studyMaterialsTable.subjectId, subjectId) : undefined,
          topicId ? eq(studyMaterialsTable.topicId, topicId) : undefined
        )
      );

    res.json(materials);
  } catch (err) {
    console.error("Get materials error:", err);
    res.status(500).json({ error: "Failed to get materials" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, topicId, title, content, type, generateAI } = req.body;

    if (!subjectId || !title || !content) {
      res.status(400).json({ error: "Subject ID, title, and content are required" });
      return;
    }

    let aiData = {};
    if (generateAI) {
      aiData = await generateAIContent(title, content);
    }

    const [material] = await db
      .insert(studyMaterialsTable)
      .values({
        userId,
        subjectId,
        topicId: topicId || null,
        title,
        content,
        type: type || "notes",
        aiGenerated: !!generateAI,
        flashcards: (aiData as any).flashcards || null,
        summary: (aiData as any).summary || null,
        shortAnswerQuestions: (aiData as any).shortAnswerQuestions || null,
        mcqs: (aiData as any).mcqs || null,
      })
      .returning();

    res.status(201).json(material);
  } catch (err) {
    console.error("Create material error:", err);
    res.status(500).json({ error: "Failed to create material" });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, topicId, title, generateAI } = req.body;

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    if (!subjectId || !title) {
      res.status(400).json({ error: "Subject ID and title are required" });
      return;
    }

    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    } catch (extractErr: any) {
      res.status(400).json({ error: extractErr.message || "Failed to extract text from file" });
      return;
    }

    if (!extractedText || extractedText.trim().length < 10) {
      res.status(400).json({ error: "Could not extract enough text from the file. Please ensure it contains readable text." });
      return;
    }

    let aiData = {};
    if (generateAI !== "false" && generateAI !== false) {
      aiData = await generateAIContent(title, extractedText);
    }

    const [material] = await db
      .insert(studyMaterialsTable)
      .values({
        userId,
        subjectId: parseInt(subjectId),
        topicId: topicId ? parseInt(topicId) : null,
        title,
        content: extractedText.slice(0, 10000),
        type: "pdf_text",
        aiGenerated: true,
        flashcards: (aiData as any).flashcards || null,
        summary: (aiData as any).summary || null,
        shortAnswerQuestions: (aiData as any).shortAnswerQuestions || null,
        mcqs: (aiData as any).mcqs || null,
      })
      .returning();

    res.status(201).json({
      ...material,
      fileName: req.file.originalname,
      extractedChars: extractedText.length,
    });
  } catch (err) {
    console.error("Upload material error:", err);
    res.status(500).json({ error: "Failed to process file" });
  }
});

router.get("/:materialId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const materialId = parseInt(req.params.materialId);

    const [material] = await db
      .select()
      .from(studyMaterialsTable)
      .where(and(eq(studyMaterialsTable.id, materialId), eq(studyMaterialsTable.userId, userId)))
      .limit(1);

    if (!material) {
      res.status(404).json({ error: "Material not found" });
      return;
    }

    res.json(material);
  } catch (err) {
    console.error("Get material error:", err);
    res.status(500).json({ error: "Failed to get material" });
  }
});

router.delete("/:materialId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const materialId = parseInt(req.params.materialId);

    await db.delete(studyMaterialsTable).where(and(eq(studyMaterialsTable.id, materialId), eq(studyMaterialsTable.userId, userId)));

    res.json({ message: "Material deleted" });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

export default router;
