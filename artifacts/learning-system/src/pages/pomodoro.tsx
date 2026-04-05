import { useState, useEffect, useRef } from "react";
import { useCreatePomodoroSession, useGetPomodoroSessions, useGetSubjects } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPomodoroSessionsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Coffee, BookOpen, Zap, Brain, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "focus" | "short" | "long";

const PRESETS = [
  {
    id: "exam",
    label: "Exam Mode",
    description: "Deep focus for exam prep",
    icon: "🎓",
    focus: 50,
    short: 10,
    long: 30,
    recommended: true,
  },
  {
    id: "deep",
    label: "Deep Work",
    description: "Extended concentration",
    icon: "🧠",
    focus: 90,
    short: 20,
    long: 30,
    recommended: false,
  },
  {
    id: "classic",
    label: "Classic",
    description: "Original Pomodoro",
    icon: "🍅",
    focus: 25,
    short: 5,
    long: 15,
    recommended: false,
  },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Pomodoro() {
  const [presetId, setPresetId] = useState<PresetId>("exam");
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(50 * 60);
  const [isActive, setIsActive] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");
  const [sessionCount, setSessionCount] = useState(0);
  const completedRef = useRef(false);

  const { data: subjects } = useGetSubjects();
  const { data: sessions } = useGetPomodoroSessions();
  const createSession = useCreatePomodoroSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const preset = PRESETS.find((p) => p.id === presetId)!;

  const getDuration = (m: Mode) => {
    if (m === "focus") return preset.focus * 60;
    if (m === "short") return preset.short * 60;
    return preset.long * 60;
  };

  useEffect(() => {
    completedRef.current = false;
    setIsActive(false);
    setTimeLeft(getDuration(mode));
  }, [presetId, mode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (isActive && timeLeft === 0 && !completedRef.current) {
      completedRef.current = true;
      handleComplete();
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft]);

  const handleComplete = async () => {
    setIsActive(false);

    if (mode === "focus") {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);

      toast({
        title: "Focus session complete! 🎉",
        description: newCount % 4 === 0
          ? `Great work! Time for a ${preset.long}-minute long break.`
          : `Session ${newCount} done. Take a ${preset.short}-minute break.`,
      });

      if (subjectId) {
        try {
          await createSession.mutateAsync({
            data: {
              subjectId: parseInt(subjectId),
              durationMinutes: preset.focus,
              breakMinutes: preset.short,
              completedPomodoros: 1,
            },
          });
          queryClient.invalidateQueries({ queryKey: getGetPomodoroSessionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        } catch (e) {}
      }

      const nextMode: Mode = sessionCount > 0 && (sessionCount + 1) % 4 === 0 ? "long" : "short";
      setMode(nextMode);
      setTimeLeft(getDuration(nextMode));
    } else {
      toast({
        title: mode === "long" ? "Long break over! 💪" : "Break over!",
        description: "Ready for another focus session?",
      });
      setMode("focus");
      setTimeLeft(getDuration("focus"));
    }
  };

  const switchMode = (m: Mode) => {
    setIsActive(false);
    completedRef.current = false;
    setMode(m);
    setTimeLeft(getDuration(m));
  };

  const switchPreset = (id: PresetId) => {
    setIsActive(false);
    completedRef.current = false;
    setPresetId(id);
    setMode("focus");
  };

  const resetTimer = () => {
    setIsActive(false);
    completedRef.current = false;
    setTimeLeft(getDuration(mode));
  };

  const totalDuration = getDuration(mode);
  const percentage = ((totalDuration - timeLeft) / totalDuration) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const modeColor = mode === "focus" ? "stroke-primary" : mode === "short" ? "stroke-accent" : "stroke-green-500";
  const bgGradient = mode === "focus"
    ? "from-primary/5 to-transparent"
    : mode === "short"
    ? "from-accent/5 to-transparent"
    : "from-green-500/5 to-transparent";

  const sessionDots = Array.from({ length: 4 }, (_, i) => i < (sessionCount % 4));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-1">
        <h1 className="text-4xl font-display font-bold text-foreground">Focus Timer</h1>
        <p className="text-muted-foreground">Optimised for college exam preparation.</p>
      </div>

      {/* Preset Selector */}
      <div className="grid grid-cols-3 gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => switchPreset(p.id)}
            className={`relative p-4 rounded-2xl border text-left transition-all ${
              presetId === p.id
                ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                : "border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            {p.recommended && (
              <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Recommended
              </span>
            )}
            <div className="text-2xl mb-2">{p.icon}</div>
            <p className="font-bold text-sm text-foreground">{p.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded text-foreground">{p.focus}m focus</span>
              <span className="text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded text-foreground">{p.short}m break</span>
              <span className="text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{p.long}m long</span>
            </div>
          </button>
        ))}
      </div>

      {/* Main Timer Card */}
      <div className={`bg-card border border-border/50 rounded-3xl p-8 md:p-12 shadow-xl flex flex-col items-center relative overflow-hidden bg-gradient-to-b ${bgGradient}`}>
        {/* Progress bar top */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-secondary">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              mode === "focus" ? "bg-primary" : mode === "short" ? "bg-accent" : "bg-green-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-10 mt-4 bg-secondary/50 p-1.5 rounded-full border border-border/50">
          <Button
            variant={mode === "focus" ? "default" : "ghost"}
            className="rounded-full px-5 text-sm gap-1.5"
            onClick={() => switchMode("focus")}
          >
            <Brain className="w-3.5 h-3.5" /> Focus ({preset.focus}m)
          </Button>
          <Button
            variant={mode === "short" ? "default" : "ghost"}
            className={`rounded-full px-5 text-sm gap-1.5 ${mode === "short" ? "bg-accent hover:bg-accent/90 text-white" : ""}`}
            onClick={() => switchMode("short")}
          >
            <Coffee className="w-3.5 h-3.5" /> Break ({preset.short}m)
          </Button>
          <Button
            variant={mode === "long" ? "default" : "ghost"}
            className={`rounded-full px-5 text-sm gap-1.5 ${mode === "long" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            onClick={() => switchMode("long")}
          >
            <Zap className="w-3.5 h-3.5" /> Long ({preset.long}m)
          </Button>
        </div>

        {/* Circular Timer */}
        <div className="relative w-72 h-72 flex items-center justify-center mb-10">
          <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r={radius} className="stroke-secondary fill-none" strokeWidth="14" />
            <circle
              cx="130" cy="130" r={radius}
              className={`${modeColor} fill-none transition-all duration-1000 ease-linear`}
              strokeWidth="14"
              strokeLinecap="round"
              style={{ strokeDasharray: circumference, strokeDashoffset }}
            />
          </svg>
          <div className="text-center">
            <div className="text-7xl font-display font-bold tracking-tighter tabular-nums text-foreground">
              {formatTime(timeLeft)}
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-widest">
              {mode === "focus" ? "Focus" : mode === "short" ? "Short Break" : "Long Break"}
            </p>
          </div>
        </div>

        {/* Session dots tracker */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-xs text-muted-foreground mr-1">Session</span>
          {sessionDots.map((done, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                done ? "bg-primary scale-110" : "bg-secondary border border-border"
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">({sessionCount} done today)</span>
        </div>

        {/* Subject selector */}
        {mode === "focus" && (
          <div className="w-full max-w-sm mb-6">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="h-13 bg-background border-border/50 rounded-xl font-medium shadow-sm">
                <SelectValue placeholder="What are you studying?" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6">
          <Button
            size="icon"
            variant="outline"
            className="w-14 h-14 rounded-full border-border/50 hover:bg-secondary"
            onClick={resetTimer}
          >
            <RotateCcw className="w-6 h-6 text-muted-foreground" />
          </Button>
          <Button
            className={`w-24 h-24 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 ${
              mode === "focus"
                ? "bg-primary hover:bg-primary/90 shadow-primary/30"
                : mode === "short"
                ? "bg-accent hover:bg-accent/90 shadow-accent/30"
                : "bg-green-600 hover:bg-green-700 shadow-green-500/30"
            }`}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive
              ? <Pause className="w-10 h-10 text-white" />
              : <Play className="w-10 h-10 ml-1 text-white" />}
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {[
          { icon: "💡", tip: "Study one topic per session for best retention" },
          { icon: "📵", tip: "Put your phone on Do Not Disturb during focus time" },
          { icon: "💧", tip: "Drink water and stretch during every break" },
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-secondary/30 border border-border/30">
            <span>{t.icon}</span>
            <p className="text-muted-foreground">{t.tip}</p>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      <div>
        <h3 className="font-display font-bold text-xl mb-4 text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Recent Sessions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sessions?.slice(0, 4).map((session) => (
            <div
              key={session.id}
              className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <p className="font-bold text-foreground truncate">
                  {subjects?.find((s) => s.id === session.subjectId)?.name || "General Study"}
                </p>
              </div>
              <div className="flex justify-between items-end border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground font-medium">
                  {new Date(session.createdAt).toLocaleDateString()}
                </p>
                <p className="font-bold text-xl text-primary">{session.durationMinutes}m</p>
              </div>
            </div>
          ))}
          {sessions?.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
              No sessions yet. Start your first focus session!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
