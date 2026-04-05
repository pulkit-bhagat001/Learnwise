import { LayoutDashboard, BookOpen, FileText, CheckSquare, Calendar, Timer, Brain, Trophy, User } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Study Materials", url: "/materials", icon: FileText },
  { title: "Assignments", url: "/assignments", icon: CheckSquare },
  { title: "Attendance", url: "/attendance", icon: Calendar },
  { title: "Pomodoro Timer", url: "/pomodoro", icon: Timer },
  { title: "AI Study Planner", url: "/planner", icon: Brain },
  { title: "Rewards", url: "/rewards", icon: Trophy },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold text-lg mb-4 mt-2">
            Learner AI
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="mr-2" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {user && (
        <SidebarFooter className="border-t p-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{user.name}</span>
              <span className="text-xs text-muted-foreground">
                <Trophy className="inline w-3 h-3 mr-1 text-yellow-500" />
                {user.points || 0} pts • {user.streakDays || 0} day streak
              </span>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
