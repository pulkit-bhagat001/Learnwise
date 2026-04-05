import { useState } from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatMinutes } from "@/lib/utils";
import { Flame, Clock, Award, CalendarCheck, BookOpen, AlertCircle, ArrowRight, Zap, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading) {
    return <div className="h-[60vh] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-card border border-border shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-primary/5 mix-blend-overlay z-0" />
        <div className="relative z-20 p-8 md:p-12 max-w-2xl">
          <h1 className="text-4xl font-display font-bold mb-4 text-foreground">Welcome back!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            {data.motivationalTip || "Ready to crush your goals today? Let's make every minute count."}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/pomodoro">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-transform cursor-pointer">
                <Zap className="w-5 h-5" /> Start Study Session
              </span>
            </Link>
            <Link href="/planner">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors cursor-pointer">
                <BookOpen className="w-5 h-5" /> View AI Plan
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Study Hours" 
          value={`${data.totalStudyHours.toFixed(1)}h`}
          subtitle={`${data.weeklyStudyHours.toFixed(1)}h this week`}
          icon={Clock}
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <StatsCard 
          title="Current Streak" 
          value={`${data.currentStreak} Days`}
          subtitle={`Best: ${data.longestStreak} days`}
          icon={Flame}
          color="text-orange-500"
          bg="bg-orange-500/10"
        />
        <StatsCard 
          title="Total Points" 
          value={data.totalPoints.toLocaleString()}
          subtitle={`Level ${data.level}`}
          icon={Award}
          color="text-purple-500"
          bg="bg-purple-500/10"
        />
        <StatsCard 
          title="Attendance" 
          value={`${data.attendancePercent.toFixed(0)}%`}
          subtitle="Overall average"
          icon={CalendarCheck}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--secondary))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(val: number) => [`${val} min`, 'Studied']}
                      labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    />
                    <Bar dataKey="studyMinutes" radius={[4, 4, 0, 0]}>
                      {data.weeklyActivity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Subject Performance</CardTitle>
              <Link href="/subjects">
                <span className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer">
                  View all <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {data.subjectStats.map(stat => (
                  <div key={stat.subjectId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 w-1/3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span className="font-medium truncate text-foreground">{stat.subjectName}</span>
                    </div>
                    <div className="w-1/3 px-4">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ width: `${stat.performanceScore}%`, backgroundColor: stat.color }}
                        />
                      </div>
                    </div>
                    <div className="w-1/3 text-right text-sm text-muted-foreground font-medium">
                      {formatMinutes(stat.studyMinutes)} • {stat.performanceScore}%
                    </div>
                  </div>
                ))}
                {data.subjectStats.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">No subjects tracked yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar content */}
        <div className="space-y-8">
          {/* AI Recommendations */}
          <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" /> 
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.weakSubjects.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-destructive tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Focus Required
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {data.weakSubjects.map(sub => (
                      <span key={sub} className="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase text-primary tracking-wider">Recommendations</span>
                <ul className="space-y-3">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span className="text-foreground/90 font-medium leading-relaxed">{rec}</span>
                    </li>
                  ))}
                  {data.recommendations.length === 0 && (
                    <li className="text-muted-foreground text-sm">Keep up the good work! AI will provide tips as you study more.</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Assignments Summary */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Assignments</CardTitle>
              <Link href="/assignments">
                <span className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer">
                  View <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-secondary/50 rounded-xl p-4 text-center border border-border/50">
                  <p className="text-3xl font-display font-bold text-foreground">{data.pendingAssignments}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">PENDING</p>
                </div>
                <div className="bg-destructive/10 rounded-xl p-4 text-center border border-destructive/20">
                  <p className="text-3xl font-display font-bold text-destructive">{data.overdueAssignments}</p>
                  <p className="text-xs text-destructive font-medium mt-1">OVERDUE</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Upcoming Exams */}
          {data.upcomingExams && data.upcomingExams.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle>Upcoming Exams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.upcomingExams.map((exam, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{exam.subjectName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(exam.examDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-xl text-primary">{exam.daysLeft}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Days Left</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon: Icon, color, bg }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}
