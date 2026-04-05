import { useGetAttendance, useGetSubjects, useMarkAttendance } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAttendanceQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Attendance() {
  const { data: subjects } = useGetSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  const queryParams = selectedSubject !== "all" ? { subjectId: parseInt(selectedSubject) } : undefined;
  const { data: attendance, isLoading } = useGetAttendance(queryParams as any, { query: { enabled: true } });
  
  const markAttendance = useMarkAttendance();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMark = async (status: "present" | "absent" | "late") => {
    if (selectedSubject === "all") {
      toast({ title: "Please select a subject first", variant: "destructive" });
      return;
    }
    try {
      await markAttendance.mutateAsync({
        data: {
          subjectId: parseInt(selectedSubject),
          date: new Date().toISOString().split('T')[0],
          status
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey() });
      toast({ title: "Attendance recorded" });
    } catch(e) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground">Track your classes and maintain your goals.</p>
        </div>
        
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[200px] bg-card border-border/50">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects?.map(s => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
      ) : (
        <>
          {attendance?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card shadow-sm border-border/50">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Overall</p>
                  <p className="text-4xl font-display font-bold text-primary">{attendance.stats.percentage.toFixed(0)}%</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Present</p>
                  <p className="text-4xl font-display font-bold text-emerald-600 dark:text-emerald-400">{attendance.stats.presentDays}</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-destructive text-sm font-bold uppercase tracking-wider mb-2">Absent</p>
                  <p className="text-4xl font-display font-bold text-destructive">{attendance.stats.absentDays}</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/20 shadow-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm font-bold uppercase tracking-wider mb-2">Late</p>
                  <p className="text-4xl font-display font-bold text-yellow-600 dark:text-yellow-400">{attendance.stats.lateDays}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendance?.records?.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-background shadow-sm">
                          {record.status === 'present' ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> :
                           record.status === 'absent' ? <XCircle className="text-destructive w-5 h-5" /> :
                           <Clock className="text-yellow-500 w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{subjects?.find(s => s.id === record.subjectId)?.name}</p>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <span className={`uppercase text-[10px] tracking-wider font-bold px-3 py-1.5 rounded-full border
                        ${record.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 
                          record.status === 'absent' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                          'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'}`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                  {attendance?.records?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      No records found. Select a subject to mark attendance.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-b from-primary/10 to-card border-primary/20 shadow-md">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" /> Mark Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium text-center mb-6">
                  {selectedSubject === "all" ? 
                    <span className="text-muted-foreground">Select a subject from the top dropdown to mark attendance.</span> : 
                    <span className="text-foreground">Marking for: <br/><strong className="text-primary text-lg">{subjects?.find(s => s.id.toString() === selectedSubject)?.name}</strong></span>
                  }
                </p>
                <Button 
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  onClick={() => handleMark("present")}
                  disabled={selectedSubject === "all" || markAttendance.isPending}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Present
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-14 border-yellow-500/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => handleMark("late")}
                  disabled={selectedSubject === "all" || markAttendance.isPending}
                >
                  <Clock className="w-5 h-5 mr-2" /> Late
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-14 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => handleMark("absent")}
                  disabled={selectedSubject === "all" || markAttendance.isPending}
                >
                  <XCircle className="w-5 h-5 mr-2" /> Absent
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
