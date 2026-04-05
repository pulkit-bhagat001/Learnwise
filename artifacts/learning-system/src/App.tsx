import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Subjects from "@/pages/subjects";
import SubjectDetail from "@/pages/subject-detail";
import Materials from "@/pages/materials";
import Assignments from "@/pages/assignments";
import Attendance from "@/pages/attendance";
import Pomodoro from "@/pages/pomodoro";
import Planner from "@/pages/planner";
import Rewards from "@/pages/rewards";
import Profile from "@/pages/profile";

function ProtectedRoute({ component: Component, ...rest }: { component: any, [key: string]: any }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return isAuthenticated ? <Component {...rest} /> : null;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-4 border-b bg-card z-10">
            <div className="flex items-center">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="mr-4" />
              <h1 className="font-display font-semibold text-lg md:hidden">Learner AI</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto bg-grid-pattern bg-background">
            <div className="container mx-auto p-4 md:p-6 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/subjects" component={() => <ProtectedRoute component={Subjects} />} />
        <Route path="/subjects/:id" component={() => <ProtectedRoute component={SubjectDetail} />} />
        <Route path="/materials" component={() => <ProtectedRoute component={Materials} />} />
        <Route path="/assignments" component={() => <ProtectedRoute component={Assignments} />} />
        <Route path="/attendance" component={() => <ProtectedRoute component={Attendance} />} />
        <Route path="/pomodoro" component={() => <ProtectedRoute component={Pomodoro} />} />
        <Route path="/planner" component={() => <ProtectedRoute component={Planner} />} />
        <Route path="/rewards" component={() => <ProtectedRoute component={Rewards} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  // Initialize theme
  useEffect(() => {
    const isDark = localStorage.getItem("theme") !== "light";
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
