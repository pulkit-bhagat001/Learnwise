import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, School, GraduationCap, Trophy, LogOut, Check, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  grade: z.string().optional(),
  school: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logout } = useAuth();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || "",
      grade: user?.grade || "",
      school: user?.school || "",
    }
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateMe.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated successfully" });
    } catch(e) {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and personal details.</p>
        </div>
        <Button variant="destructive" className="gap-2" onClick={logout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card shadow-sm border-border/50 text-center overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20 w-full" />
            <CardContent className="px-6 pb-6 pt-0 relative">
              <div className="w-24 h-24 rounded-full bg-background border-4 border-background flex items-center justify-center text-primary font-display font-bold text-4xl shadow-lg mx-auto -mt-12 mb-4 relative z-10">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground mb-6">{user.email}</p>
              
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="bg-secondary/50 p-3 rounded-xl border border-border/50">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Points
                  </p>
                  <p className="font-bold text-lg">{user.points}</p>
                </div>
                <div className="bg-secondary/50 p-3 rounded-xl border border-border/50">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3 text-orange-500" /> Streak
                  </p>
                  <p className="font-bold text-lg">{user.streakDays} Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-card shadow-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" /> Full Name
                    </Label>
                    <Input id="name" {...register("name")} className="h-12 bg-background/50" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
                    </Label>
                    <Input id="email" value={user.email} disabled className="h-12 bg-secondary/50 opacity-70" />
                    <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="grade" className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" /> Grade/Year
                      </Label>
                      <Input id="grade" {...register("grade")} placeholder="e.g. 10th Grade" className="h-12 bg-background/50" />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="school" className="flex items-center gap-2">
                        <School className="w-4 h-4 text-muted-foreground" /> School/Institution
                      </Label>
                      <Input id="school" {...register("school")} placeholder="Your School" className="h-12 bg-background/50" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button type="submit" disabled={!isDirty || updateMe.isPending} className="gap-2 h-11 px-8 shadow-md">
                    {updateMe.isPending ? "Saving..." : <><Check className="w-4 h-4" /> Save Changes</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
