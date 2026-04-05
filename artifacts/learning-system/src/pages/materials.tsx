import { useState, useRef, useCallback } from "react";
import { useGetMaterials, useCreateMaterial, useDeleteMaterial, useGetSubjects } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMaterialsQueryKey } from "@workspace/api-client-react";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Sparkles, Plus, Trash2, ChevronDown, ChevronUp,
  Upload, File, X, CheckCircle2, AlertCircle, FileType
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const textSchema = z.object({
  title: z.string().min(2, "Title required"),
  subjectId: z.coerce.number().min(1, "Select a subject"),
  type: z.enum(["notes", "text", "pdf_text", "image_text"]),
  content: z.string().min(10, "Provide some content"),
  generateAI: z.boolean().default(true),
});

const uploadSchema = z.object({
  title: z.string().min(2, "Title required"),
  subjectId: z.coerce.number().min(1, "Select a subject"),
  generateAI: z.boolean().default(true),
});

type TextForm = z.infer<typeof textSchema>;
type UploadForm = z.infer<typeof uploadSchema>;

function FileDropZone({
  onFileSelect,
  file,
  onClear,
}: {
  onFileSelect: (f: File) => void;
  file: File | null;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFileSelect(dropped);
    },
    [onFileSelect]
  );

  const getFileIcon = (name: string) => {
    if (name.endsWith(".pdf")) return "📄";
    if (name.endsWith(".docx") || name.endsWith(".doc")) return "📝";
    return "📃";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30">
        <span className="text-2xl">{getFileIcon(file.name)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onClear}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">Drop your file here, or <span className="text-primary underline">browse</span></p>
          <p className="text-xs text-muted-foreground mt-1">Supports PDF, Word (.docx/.doc), and Text files — up to 20 MB</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {["PDF", "DOCX", "DOC", "TXT"].map((ext) => (
            <span key={ext} className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
              {ext}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Materials() {
  const { data: materials, isLoading } = useGetMaterials();
  const { data: subjects } = useGetSubjects();
  const createMaterial = useCreateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadGenerateAI, setUploadGenerateAI] = useState(true);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<TextForm>({
    resolver: zodResolver(textSchema),
    defaultValues: { type: "text", generateAI: true }
  });

  const onTextSubmit = async (data: TextForm) => {
    try {
      await createMaterial.mutateAsync({ data: data as any });
      queryClient.invalidateQueries({ queryKey: getGetMaterialsQueryKey() });
      toast({ title: "Material created!", description: data.generateAI ? "AI is generating your flashcards and summary..." : "" });
      setIsDialogOpen(false);
      reset();
    } catch (e) {
      toast({ title: "Creation failed", variant: "destructive" });
    }
  };

  const onFileUpload = async () => {
    if (!selectedFile || !uploadSubjectId || !uploadTitle.trim()) {
      toast({ title: "Please fill in all fields and select a file", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subjectId", uploadSubjectId);
      formData.append("title", uploadTitle);
      formData.append("generateAI", String(uploadGenerateAI));

      const token = getToken();
      const res = await fetch(`${BASE}/api/materials/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: getGetMaterialsQueryKey() });
      toast({
        title: "File processed!",
        description: uploadGenerateAI
          ? "Text extracted and AI content generated successfully."
          : "Text extracted from file successfully.",
      });
      setIsDialogOpen(false);
      setSelectedFile(null);
      setUploadTitle("");
      setUploadSubjectId("");
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this material?")) return;
    try {
      await deleteMaterial.mutateAsync({ materialId: id });
      queryClient.invalidateQueries({ queryKey: getGetMaterialsQueryKey() });
      toast({ title: "Material deleted" });
    } catch (e) {}
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedFile(null);
      setUploadTitle("");
      setUploadSubjectId("");
      setActiveTab("text");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Study Materials</h1>
          <p className="text-muted-foreground">Paste notes or upload a file — let AI generate flashcards, MCQs, and summaries.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20 text-white">
              <Sparkles className="w-4 h-4" /> New AI Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Create Study Material</DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-2">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="w-4 h-4" /> Paste Text
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="w-4 h-4" /> Upload File
                </TabsTrigger>
              </TabsList>

              {/* ─── Paste Text Tab ─── */}
              <TabsContent value="text" className="pt-4">
                <form onSubmit={handleSubmit(onTextSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input {...register("title")} placeholder="e.g. Cell Biology Ch.4" />
                      {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Controller
                        name="subjectId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                            <SelectContent>
                              {subjects?.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Your Notes / Content</Label>
                    <Textarea
                      {...register("content")}
                      className="min-h-[160px] font-mono text-sm"
                      placeholder="Paste your study text here..."
                    />
                    {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
                  </div>

                  <div className="flex items-center space-x-3 bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <Controller
                      name="generateAI"
                      control={control}
                      render={({ field }) => (
                        <Checkbox id="generateAI-text" checked={field.value} onCheckedChange={field.onChange} className="border-primary data-[state=checked]:bg-primary" />
                      )}
                    />
                    <div>
                      <label htmlFor="generateAI-text" className="text-sm font-bold text-primary cursor-pointer">
                        ✨ Generate AI Assets
                      </label>
                      <p className="text-xs text-muted-foreground">Create summary, flashcards, and MCQs automatically</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createMaterial.isPending}>
                    {createMaterial.isPending ? "Processing..." : "Save Material"}
                  </Button>
                </form>
              </TabsContent>

              {/* ─── Upload File Tab ─── */}
              <TabsContent value="file" className="pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="e.g. Physics Chapter 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={uploadSubjectId} onValueChange={setUploadSubjectId}>
                        <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Upload File</Label>
                    <FileDropZone
                      file={selectedFile}
                      onFileSelect={setSelectedFile}
                      onClear={() => setSelectedFile(null)}
                    />
                  </div>

                  {selectedFile && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>File ready — AI will extract text and generate study content</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <Checkbox
                      id="generateAI-file"
                      checked={uploadGenerateAI}
                      onCheckedChange={(v) => setUploadGenerateAI(!!v)}
                      className="border-primary data-[state=checked]:bg-primary"
                    />
                    <div>
                      <label htmlFor="generateAI-file" className="text-sm font-bold text-primary cursor-pointer">
                        ✨ Generate AI Assets
                      </label>
                      <p className="text-xs text-muted-foreground">Create summary, flashcards, and MCQs from the file content</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-xs text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>Text is extracted directly from your file and sent to AI. Scanned image-only PDFs may not work well — use a text-based PDF or type your notes instead.</span>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    onClick={onFileUpload}
                    disabled={isUploading || !selectedFile || !uploadTitle.trim() || !uploadSubjectId}
                  >
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Extracting & Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Upload & Generate
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {materials?.map(material => (
          <Card key={material.id} className="bg-card border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div
              className="p-6 cursor-pointer flex items-start justify-between hover:bg-secondary/20 transition-colors"
              onClick={() => setExpandedId(expandedId === material.id ? null : material.id)}
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {material.type === "pdf_text" ? <FileType className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display flex items-center gap-2 text-foreground">
                    {material.title}
                    {material.type === "pdf_text" && (
                      <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-blue-500/20">
                        File
                      </span>
                    )}
                    {material.aiGenerated && (
                      <span className="bg-accent/20 text-accent text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-accent/20 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    {subjects?.find(s => s.id === material.subjectId)?.name} •{" "}
                    {new Date(material.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(material.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                <div className="text-muted-foreground">
                  {expandedId === material.id ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>
            </div>

            {expandedId === material.id && (
              <div className="border-t border-border/50 bg-secondary/10 p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                {material.summary && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-primary text-sm uppercase tracking-wider">AI Summary</h4>
                    <div className="p-4 rounded-xl bg-card border border-border/50 text-sm leading-relaxed text-foreground/90">
                      {material.summary}
                    </div>
                  </div>
                )}

                {material.flashcards && (material.flashcards as any[]).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-accent text-sm uppercase tracking-wider">
                      Flashcards ({(material.flashcards as any[]).length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(material.flashcards as any[]).map((card, i) => (
                        <FlashcardItem key={i} front={card.front} back={card.back} />
                      ))}
                    </div>
                  </div>
                )}

                {material.mcqs && (material.mcqs as any[]).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-yellow-500 text-sm uppercase tracking-wider">
                      MCQs ({(material.mcqs as any[]).length})
                    </h4>
                    <div className="space-y-3">
                      {(material.mcqs as any[]).map((mcq, i) => (
                        <MCQItem key={i} mcq={mcq} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
                    {material.type === "pdf_text" ? "Extracted Text" : "Original Content"}
                  </h4>
                  <div className="p-4 rounded-xl bg-background border border-border/50 text-sm leading-relaxed max-h-64 overflow-y-auto font-mono text-muted-foreground whitespace-pre-wrap">
                    {material.content}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}

        {materials?.length === 0 && (
          <div className="py-16 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/50">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-2 font-medium">No study materials yet.</p>
            <p className="text-sm">Paste your notes or upload a PDF/Word file to generate AI study assets.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FlashcardItem({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="h-40 relative cursor-pointer transition-all duration-500 w-full"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.5s",
        }}
      >
        <div
          className="absolute inset-0 bg-card border border-border/50 rounded-xl p-4 flex items-center justify-center text-center shadow-sm hover:border-primary/50 transition-colors"
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="font-medium text-sm text-foreground">{front}</p>
          <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Tap to flip</div>
        </div>
        <div
          className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-center text-center shadow-sm"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="font-medium text-sm text-primary">{back}</p>
        </div>
      </div>
    </div>
  );
}

function MCQItem({ mcq, index }: { mcq: any; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
      <p className="font-medium text-sm">
        <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
        {mcq.question}
      </p>
      <div className="space-y-2">
        {mcq.options?.map((opt: string, i: number) => {
          const isCorrect = i === mcq.correctIndex;
          const isSelected = selected === i;
          let cls = "border-border/50 text-foreground/80 hover:border-primary/50 hover:bg-primary/5";
          if (selected !== null) {
            if (isCorrect) cls = "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400";
            else if (isSelected && !isCorrect) cls = "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400";
          }
          return (
            <button
              key={i}
              type="button"
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${cls}`}
              onClick={() => { if (selected === null) setSelected(i); }}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && mcq.explanation && (
        <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">
          💡 {mcq.explanation}
        </p>
      )}
    </div>
  );
}
