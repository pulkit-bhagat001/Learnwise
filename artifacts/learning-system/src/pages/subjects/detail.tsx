import { useState } from "react";
import { useRoute } from "wouter";
import { useGetSubject, useCreateTopic, useUpdateTopic, useDeleteTopic } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSubjectQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, PlayCircle, CheckCircle2, Circle, AlertCircle, Trash2, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatMinutes } from "@/lib/utils";

const topicSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

type TopicForm = z.infer<typeof topicSchema>;

export default function SubjectDetail() {
  const [match, params] = useRoute("/subjects/:id");
  const subjectId = params?.id ? parseInt(params.id) : 0;
  
  const { data: subject, isLoading } = useGetSubject(subjectId, { query: { enabled: !!subjectId } });
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TopicForm>({
    resolver: zodResolver(topicSchema),
    defaultValues: { difficulty: "medium" }
  });

  const onSubmit = async (data: TopicForm) => {
    try {
      await createTopic.mutateAsync({ subjectId, data: data as any });
      queryClient.invalidateQueries({ queryKey: getGetSubjectQueryKey(subjectId) });
      toast({ title: "Topic created!" });
      setIsCreateOpen(false);
      reset();
    } catch (e) {
      toast({ title: "Error creating topic", variant: "destructive" });
    }
  };

  const handleStatusChange = async (topicId: number, status: string) => {
    const topic = subject?.topics?.find(t => t.id === topicId);
    if (!topic) return;
    try {
      await updateTopic.mutateAsync({ 
        subjectId, 
        topicId, 
        data: { name: topic.name, difficulty: topic.difficulty, status } as any
      });
      queryClient.invalidateQueries({ queryKey: getGetSubjectQueryKey(subjectId) });
    } catch(e) {
      toast({ title: "Status update failed", variant: "destructive" });
    }
  };

  const handleDelete = async (topicId: number) => {
    if (!confirm("Delete this topic?")) return;
    try {
      await deleteTopic.mutateAsync({ subjectId, topicId });
      queryClient.invalidateQueries({ queryKey: getGetSubjectQueryKey(subjectId) });
      toast({ title: "Topic deleted" });
    } catch(e) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!subject) return <div>Subject not found</div>;

  return (
    <div className="space-y-8">
      <Link href="/subjects" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Subjects
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }} />
            <h1 className="text-4xl font-display font-bold">{subject.name}</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">{subject.description}</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-secondary/50 rounded-xl px-4 py-2 border border-border/50 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Time Studied</p>
            <p className="font-display font-bold text-xl">{formatMinutes(subject.totalStudyMinutes)}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl px-4 py-2 border border-border/50 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Score</p>
            <p className="font-display font-bold text-xl text-primary">{subject.performanceScore}%</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Topics Curriculum</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" style={{ backgroundColor: subject.color }}>
              <Plus className="w-4 h-4" /> Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Topic</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Topic Name</Label>
                <Input {...register("name")} placeholder="e.g. Limits and Continuity" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input {...register("description")} placeholder="Brief overview..." />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Controller
                  name="difficulty"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button type="submit" className="w-full">Create Topic</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {subject.topics?.map((topic) => (
          <div key={topic.id} className="group flex items-center justify-between p-4 bg-card border border-border/50 rounded-xl hover:shadow-md transition-all hover:border-border">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {topic.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                 topic.status === 'in_progress' ? <PlayCircle className="w-5 h-5 text-blue-500" /> :
                 topic.status === 'needs_revision' ? <AlertCircle className="w-5 h-5 text-orange-500" /> :
                 <Circle className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{topic.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium uppercase tracking-wider
                    ${topic.difficulty === 'hard' ? 'bg-destructive/10 text-destructive' : 
                      topic.difficulty === 'medium' ? 'bg-warning/10 text-warning' : 
                      'bg-success/10 text-success'}`}>
                    {topic.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatMinutes(topic.studyMinutes)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Select 
                value={topic.status} 
                onValueChange={(val) => handleStatusChange(topic.id, val)}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <button 
                onClick={() => handleDelete(topic.id)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {(!subject.topics || subject.topics.length === 0) && (
          <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/50">
            No topics created yet. Add topics to build your curriculum.
          </div>
        )}
      </div>
    </div>
  );
}
