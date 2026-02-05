import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User,
  Crown,
  Shield,
  Mail,
  Calendar,
  Sparkles,
  LogOut,
  Settings as SettingsIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { GeneratedApp } from "@shared/schema";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: apps = [] } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const stats = {
    totalApps: apps.length,
    publishedApps: apps.filter(app => app.isPublished).length,
    webApps: apps.filter(app => app.appType === "web" || !app.appType).length,
    games: apps.filter(app => app.appType === "3d-game").length,
    vrWorlds: apps.filter(app => app.appType === "vr-world").length,
    nativeApps: apps.filter(app => app.appType === "native").length,
  };

  return (
    <div className="min-h-screen obsidian-bg pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-700/20 mb-6 neon-purple-glow">
            <User className="w-10 h-10 text-violet-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
            {user?.email?.split("@")[0] || "Creator"}
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {user?.isAdmin && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
            {user?.isPro && (
              <Badge variant="outline" className="border-primary text-primary">
                <Crown className="w-3 h-3 mr-1" />
                Pro Member
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="forge-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-violet-400" />
                <span>{user?.email}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="forge-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Member Since</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="forge-card border-0 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Creation Stats
            </CardTitle>
            <CardDescription>Your creative journey in numbers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-violet-500/10 neon-purple-border">
                <div className="text-2xl font-bold text-primary">{stats.totalApps}</div>
                <div className="text-xs text-muted-foreground">Total Apps</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">{stats.publishedApps}</div>
                <div className="text-xs text-muted-foreground">Published</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="text-2xl font-bold text-blue-400">{stats.webApps}</div>
                <div className="text-xs text-muted-foreground">Web Apps</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="text-2xl font-bold text-orange-400">{stats.games}</div>
                <div className="text-xs text-muted-foreground">3D Games</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-pink-500/10 border border-pink-500/30">
                <div className="text-2xl font-bold text-pink-400">{stats.vrWorlds}</div>
                <div className="text-xs text-muted-foreground">VR Worlds</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <div className="text-2xl font-bold text-cyan-400">{stats.nativeApps}</div>
                <div className="text-xs text-muted-foreground">Native Apps</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          {!user?.isPro && !user?.isAdmin && (
            <Link href="/pricing" className="flex-1">
              <Button className="w-full gap-2" data-testid="button-upgrade">
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </Button>
            </Link>
          )}
          <Link href="/settings" className="flex-1">
            <Button variant="outline" className="w-full gap-2" data-testid="button-settings">
              <SettingsIcon className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="flex-1 gap-2" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
