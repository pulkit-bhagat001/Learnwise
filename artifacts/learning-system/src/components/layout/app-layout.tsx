import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, BookOpen, Layers, FileText, 
  CheckSquare, Calendar, Timer, Sparkles, 
  Award, User, Menu, X, LogOut, Flame, Moon, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subjects", label: "Subjects", icon: Layers },
  { href: "/materials", label: "Materials", icon: FileText },
  { href: "/assignments", label: "Assignments", icon: CheckSquare },
  { href: "/attendance", label: "Attendance", icon: Calendar },
  { href: "/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/planner", label: "AI Planner", icon: Sparkles },
  { href: "/rewards", label: "Rewards", icon: Award },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => 
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-primary/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-xl relative z-20">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
              P
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 dark:from-white dark:to-white/70">
              Pulse
            </span>
          </Link>
        </div>

        <div className="px-4 py-2">
          <div className="bg-secondary/50 rounded-2xl p-4 flex items-center gap-3 border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Flame className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-muted-foreground">{user.streak} Day Streak</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary rounded-xl z-0 shadow-md shadow-primary/20"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2">
          <Link 
            href="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border/50 glass z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold">P</div>
          <span className="font-display font-bold text-lg">Pulse</span>
        </Link>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-foreground">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              onClick={closeMobileMenu}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-card border-l border-border/50 z-50 flex flex-col shadow-2xl md:hidden"
            >
              <div className="p-4 flex justify-between items-center border-b border-border/50">
                <span className="font-display font-bold text-lg">Menu</span>
                <button onClick={closeMobileMenu} className="p-2 -mr-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-4 overflow-y-auto space-y-1">
                {NAV_ITEMS.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                      location === item.href 
                        ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-border/50">
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
                  <LogOut className="w-5 h-5" /> Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative max-w-full overflow-hidden">
        {/* Decorative background effects */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-border/50 glass sticky top-0 z-30 hidden md:flex items-center justify-between px-8">
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
            <span className="capitalize">{location.split('/')[1] || 'Dashboard'}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
              <Award className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-foreground">{user.totalPoints} pts</span>
            </div>
            <button 
              onClick={toggleTheme} 
              className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground border border-border/50 hover:bg-secondary transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 bg-grid-pattern relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
