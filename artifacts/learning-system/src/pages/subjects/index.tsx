import { useState } from "react";
import { Link } from "wouter";
import { useGetSubjects, useCreateSubject, useDeleteSubject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSubjectsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMinutes } from "@/lib/utils";
import { Plus, BookOpen, Clock, BarChart2, Calendar, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const subjectSchema = z.object({
  name: z.string().min(2, "Name required"),
  color: z.string().min(4, "Color required"),
  description: z.string().optional(),
});

type SubjectForm = z.infer<typeof subjectSchema>;

const COLORS = ["#8b5cf6", "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#eab308", "#10b981", "#06b6d4", "#0ea5e9", "#3b82f6"];

export default function Subjects() {
  const { data: subjects, isLoading } = useGetSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { color: COLORS[0] }
  });
  
  const selectedColor = watch("color");

  const onSubmit = async (data: SubjectForm) => {
    try {
      await createSubject.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
      toast({ title: "Subject created!" });
      setIsDialogOpen(false);
      reset();
    } catch (e) {
      toast({ title: "Error creating subject", variant: "destructive" });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this subject?")) return;
    try {
      await deleteSubject.mutateAsync({ subjectId: id });
      queryClient.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
      toast({ title: "Subject deleted" });
    } catch (e) {
      toast({ title: "Error deleting subject", variant: "destructive" });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Subjects</h1>
          <p className="text-muted-foreground">Manage your curriculum and track progress.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input placeholder="e.g., Advanced Calculus" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Color Theme</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue("color", c)}
                      className={`w-8 h-8 rounded-full transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'}`}
                      style={{ backgroundColor: c, ringColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="Brief description..." {...register("description")} />
              </div>

              <Button type="submit" className="w-full" disabled={createSubject.isPending}>
                {createSubject.isPending ? "Creating..." : "Save Subject"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects?.map((subject, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={subject.id}
          >
            <Link href={`/subjects/${subject.id}`}>
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
                <div className="h-2 w-full" style={{ backgroundColor: subject.color }} />
                <CardContent className="p-6 relative">
                  <button 
                    onClick={(e) => handleDelete(e, subject.id)}
                    className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <h3 className="font-display font-bold text-xl mb-1 pr-8">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-6">
                    {subject.description || "No description provided."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="w-4 h-4" style={{ color: subject.color }} />
                      <span className="font-medium">{subject.completedTopics}/{subject.topicCount} Topics</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" style={{ color: subject.color }} />
                      <span className="font-medium">{formatMinutes(subject.totalStudyMinutes)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BarChart2 className="w-4 h-4" style={{ color: subject.color }} />
                      <span className="font-medium">{subject.performanceScore}% Score</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" style={{ color: subject.color }} />
                      <span className="font-medium">{subject.attendancePercent || 0}% Att.</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium">Progress</span>
                      <span className="font-bold" style={{ color: subject.color }}>
                        {subject.topicCount > 0 ? Math.round((subject.completedTopics / subject.topicCount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000" 
                        style={{ 
                          width: `${subject.topicCount > 0 ? (subject.completedTopics / subject.topicCount) * 100 : 0}%`,
                          backgroundColor: subject.color 
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
        
        {subjects?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-secondary/20">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground">No subjects yet</h3>
            <p className="text-muted-foreground mb-4">Create your first subject to start tracking.</p>
            <Button onClick={() => setIsDialogOpen(true)}>Add Subject</Button>
          </div>
        )}
      </div>
    </div>
  );
}
