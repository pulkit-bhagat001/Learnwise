import { useState } from "react";
import { useGetAssignments, useCreateAssignment, useUpdateAssignment, useGetSubjects } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAssignmentsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Plus, Check, Clock, AlertCircle } from "lucide-react";

const assignmentSchema = z.object({
  title: z.string().min(2, "Required"),
  subjectId: z.coerce.number().optional(),
  dueDate: z.string().min(1, "Required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

export default function Assignments() {
  const { data: assignments, isLoading } = useGetAssignments();
  const { data: subjects } = useGetSubjects();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, control, reset } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { priority: "medium", dueDate: new Date().toISOString().slice(0, 16) }
  });

  const onSubmit = async (data: AssignmentForm) => {
    try {
      await createAssignment.mutateAsync({ data: data as any });
      queryClient.invalidateQueries({ queryKey: getGetAssignmentsQueryKey() });
      toast({ title: "Assignment added" });
      setIsDialogOpen(false);
      reset();
    } catch(e) { }
  };

  const markComplete = async (id: number) => {
    try {
      await updateAssignment.mutateAsync({ assignmentId: id, data: { status: "completed" } });
      queryClient.invalidateQueries({ queryKey: getGetAssignmentsQueryKey() });
    } catch(e) { }
  };

  const columns = [
    { id: "pending", label: "To Do" },
    { id: "in_progress", label: "Doing" },
    { id: "overdue", label: "Overdue" },
    { id: "completed", label: "Done" },
  ];

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'urgent': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default: return 'bg-secondary text-muted-foreground border-border';
    }
  };

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground">Manage your tasks and deadlines.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...register("title")} placeholder="Read Chapter 5" />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Controller
                  name="subjectId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {subjects?.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="datetime-local" {...register("dueDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Save Assignment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full items-start">
          {columns.map(col => {
            const colAssignments = assignments?.filter(a => a.status === col.id) || [];
            return (
              <div key={col.id} className="w-80 flex flex-col bg-secondary/30 rounded-2xl p-4 border border-border/50 max-h-[calc(100vh-200px)]">
                <h3 className="font-bold text-sm uppercase tracking-wider mb-4 text-muted-foreground flex items-center justify-between">
                  {col.label}
                  <span className="bg-background px-2 py-0.5 rounded-full text-xs font-semibold">{colAssignments.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto pr-1 pb-2">
                  {colAssignments.map(assignment => (
                    <div key={assignment.id} className="bg-card p-4 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getPriorityColor(assignment.priority)}`}>
                          {assignment.priority}
                        </span>
                        {assignment.status !== 'completed' && (
                          <button 
                            onClick={() => markComplete(assignment.id)}
                            className="text-muted-foreground hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary rounded-full p-1"
                            title="Mark completed"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h4 className="font-bold mb-1 leading-tight text-foreground">{assignment.title}</h4>
                      {assignment.subjectId && (
                        <p className="text-xs text-primary font-medium mb-4">
                          {subjects?.find(s => s.id === assignment.subjectId)?.name}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto border-t border-border/50 pt-3">
                        {col.id === 'overdue' ? <AlertCircle className="w-3.5 h-3.5 text-destructive" /> : <Clock className="w-3.5 h-3.5" />}
                        <span className={col.id === 'overdue' ? 'text-destructive font-bold' : 'font-medium'}>
                          {formatDistanceToNow(new Date(assignment.dueDate), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {colAssignments.length === 0 && (
                    <div className="p-4 text-center border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-sm">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
