import { useState } from "react";
import { useGenerateStudyPlan, useGetStudyPlans, useGetSubjects } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, Calendar, Target, CheckCircle2, BookOpen } from "lucide-react";

const planSchema = z.object({
  planType: z.enum(["topic", "unit", "subject", "exam_prep"]),
  subjectId: z.coerce.number().optional(),
  examDate: z.string().optional(),
  availableHoursPerDay: z.coerce.number().min(0.5).max(12),
});

type PlanForm = z.infer<typeof planSchema>;

export default function Planner() {
  const { data: subjects } = useGetSubjects();
  const generatePlan = useGenerateStudyPlan();
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  const { register, handleSubmit, control } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { planType: "exam_prep", availableHoursPerDay: 2 }
  });

  const onSubmit = async (data: PlanForm) => {
    try {
      const res = await generatePlan.mutateAsync({ data: data as any });
      setGeneratedPlan(res);
    } catch(e) {}
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner border border-primary/20">
          <Sparkles className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">AI Study Planner</h1>
        <p className="text-muted-foreground text-lg">Generate a personalized, optimized study schedule based on your goals and available time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card shadow-lg border-border/50 sticky top-6">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold">Goal Type</Label>
                  <Controller
                    name="planType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-background h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exam_prep">Exam Preparation</SelectItem>
                          <SelectItem value="subject">Master a Subject</SelectItem>
                          <SelectItem value="topic">Learn specific Topic</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Subject</Label>
                  <Controller
                    name="subjectId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange}>
                        <SelectTrigger className="bg-background h-12"><SelectValue placeholder="Select..."/></SelectTrigger>
                        <SelectContent>
                          {subjects?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Target/Exam Date</Label>
                  <Input type="date" className="bg-background h-12" {...register("examDate")} />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Available Hours / Day</Label>
                  <Input type="number" step="0.5" className="bg-background h-12" {...register("availableHoursPerDay")} />
                </div>

                <Button type="submit" className="w-full h-14 text-md font-bold gap-2 mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 text-white" disabled={generatePlan.isPending}>
                  <Sparkles className="w-5 h-5" /> 
                  {generatePlan.isPending ? "Analyzing & Generating..." : "Generate AI Plan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          {generatePlan.isPending ? (
            <div className="h-[500px] flex flex-col items-center justify-center bg-card/50 rounded-3xl border border-border/50 animate-pulse">
              <Sparkles className="w-16 h-16 text-primary animate-spin-slow mb-6" />
              <p className="text-xl font-bold text-foreground">AI is crafting your optimal schedule...</p>
              <p className="text-muted-foreground mt-2">Analyzing your subject history and goals.</p>
            </div>
          ) : generatedPlan ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
              <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8 rounded-3xl border border-primary/20 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <BookOpen className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-display font-bold mb-3 text-foreground">{generatedPlan.title}</h2>
                  <p className="text-lg opacity-90 italic mb-8 border-l-4 border-primary pl-4 py-1 text-muted-foreground">"{generatedPlan.motivationalMessage}"</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-background px-5 py-3 rounded-xl shadow-sm border border-border/50 flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" /> 
                      <span className="font-bold">{generatedPlan.dailyTasks.length} Days Plan</span>
                    </div>
                    <div className="bg-background px-5 py-3 rounded-xl shadow-sm border border-border/50 flex items-center gap-3">
                      <Target className="w-5 h-5 text-accent" /> 
                      <span className="font-bold">{generatedPlan.availableHoursPerDay}h daily commitment</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.75rem] md:before:ml-8 before:-translate-x-px md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-primary/50 before:via-accent/30 before:to-transparent">
                {generatedPlan.dailyTasks.map((day: any, idx: number) => (
                  <div key={idx} className="relative flex items-start gap-6 group">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl border-4 border-background bg-primary text-white shadow-lg shrink-0 relative z-10 transform transition-transform group-hover:scale-110">
                      <span className="font-bold text-lg">D{day.day}</span>
                    </div>
                    <div className="flex-1 p-6 rounded-2xl bg-card border border-border/50 shadow-sm group-hover:border-primary/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4 pb-4 border-b border-border/50">
                        <h4 className="font-bold text-xl text-foreground">Day {day.day}</h4>
                        <span className="text-sm font-bold bg-secondary px-3 py-1.5 rounded-lg text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" /> {day.estimatedMinutes} mins
                        </span>
                      </div>
                      <ul className="space-y-3">
                        {day.tasks.map((task: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-[15px]">
                            <div className="mt-1 bg-secondary rounded-full p-1 shrink-0 group-hover:bg-primary/10 transition-colors">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-foreground/80 font-medium leading-relaxed">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-3xl bg-secondary/10">
              <Target className="w-20 h-20 text-muted-foreground opacity-30 mb-6" />
              <h3 className="text-2xl font-display font-bold text-muted-foreground mb-2">Ready to optimize your time?</h3>
              <p className="text-muted-foreground text-center max-w-sm">Fill out the form to generate a science-backed study schedule tailored just for you.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
