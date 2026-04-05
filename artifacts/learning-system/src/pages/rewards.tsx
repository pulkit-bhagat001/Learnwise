import { useGetRewards } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Trophy, Star, Lock, Gift, Shield, Zap, TrendingUp, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Rewards() {
  const { data, isLoading } = useGetRewards();
  const { toast } = useToast();

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>;
  if (!data) return null;

  const pointsData = [
    { name: "Study Sessions", value: data.pointsBreakdown.studySessions, color: "hsl(var(--chart-1))" },
    { name: "Assignments", value: data.pointsBreakdown.assignments, color: "hsl(var(--chart-2))" },
    { name: "Attendance", value: data.pointsBreakdown.attendance, color: "hsl(var(--chart-3))" },
    { name: "Streaks", value: data.pointsBreakdown.streaks, color: "hsl(var(--chart-4))" },
  ].filter(d => d.value > 0);

  const handleRedeem = (rewardId: number, cost: number) => {
    if (data.totalPoints < cost) {
      toast({ title: "Not enough points", variant: "destructive" });
      return;
    }
    // In a real app, we would call an API here.
    toast({ title: "Reward redeemed successfully!", description: "Check your email for details." });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Rewards & Badges</h1>
          <p className="text-muted-foreground">Turn your hard work into tangible rewards.</p>
        </div>
      </div>

      {/* Level Banner */}
      <Card className="bg-gradient-to-r from-primary to-accent border-0 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center border border-white/30 shrink-0 shadow-inner">
            <span className="text-sm font-bold text-white/80 uppercase tracking-widest">Level</span>
            <span className="text-6xl font-display font-bold text-white drop-shadow-md">{data.currentLevel}</span>
          </div>
          
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-end text-white">
              <div>
                <h2 className="text-2xl font-bold mb-1">You're doing great!</h2>
                <p className="text-white/80">{data.pointsToNextLevel} points until Level {data.currentLevel + 1}</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold">{data.totalPoints.toLocaleString()}</span>
                <span className="text-sm text-white/80 ml-2 uppercase font-bold tracking-wider">PTS</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={(data.totalPoints / (data.totalPoints + data.pointsToNextLevel)) * 100} 
                className="h-4 bg-black/20" 
                indicatorClassName="bg-white"
              />
              <div className="flex justify-between text-xs font-bold text-white/70">
                <span>Lvl {data.currentLevel}</span>
                <span>Lvl {data.currentLevel + 1}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Badges Section */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Achievement Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.badges.map((badge) => (
              <div 
                key={badge.id} 
                className={`p-5 rounded-2xl border flex flex-col items-center text-center transition-all
                  ${badge.earned ? 'bg-card border-primary/30 shadow-md hover:-translate-y-1 hover:shadow-lg hover:border-primary/60' : 'bg-secondary/30 border-border/50 opacity-60 grayscale'}`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-inner
                  ${badge.earned ? 'bg-gradient-to-br from-primary/20 to-accent/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {badge.earned ? <Trophy className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
                </div>
                <h4 className="font-bold text-sm mb-1">{badge.name}</h4>
                <p className="text-[10px] text-muted-foreground mb-2">{badge.description}</p>
                {badge.earned && <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-auto">EARNED</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" /> Points Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pointsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pointsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {pointsData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-accent" /> Available Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.availableRewards.map(reward => {
                const canAfford = data.totalPoints >= reward.cost;
                return (
                  <div key={reward.id} className="p-4 rounded-xl border border-border/50 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold leading-tight">{reward.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{reward.description}</p>
                      </div>
                      <span className="bg-secondary px-2 py-1 rounded-md text-xs font-bold shrink-0">{reward.cost} pts</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full" 
                      variant={canAfford ? "default" : "secondary"}
                      disabled={!canAfford}
                      onClick={() => handleRedeem(reward.id, reward.cost)}
                    >
                      {canAfford ? "Redeem" : "Not enough points"}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
