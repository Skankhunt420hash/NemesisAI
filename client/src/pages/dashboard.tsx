import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Wrench,
  FolderClock,
  Sparkles,
  ArrowRight,
  Globe,
  Gamepad2,
  Glasses,
  Smartphone,
  Zap,
  Crown,
} from "lucide-react";
import type { GeneratedApp } from "@shared/schema";

const appTypeIcons: Record<string, typeof Globe> = {
  web: Globe,
  "3d-game": Gamepad2,
  "vr-world": Glasses,
  native: Smartphone,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: apps = [] } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  const recentApps = apps.slice(0, 4);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-dashboard-title">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your creative workspace awaits. What will you build today?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/create">
          <Card className="glass-card glass-card-hover cursor-pointer group h-full" data-testid="card-quick-create">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20 glow-cyan-subtle">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-medium">New Project</p>
                <p className="text-xs text-muted-foreground">Start building</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/tools">
          <Card className="glass-card glass-card-hover cursor-pointer group h-full" data-testid="card-quick-tools">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-md flex items-center justify-center bg-accent/20 border border-accent/20 glow-violet-subtle">
                <Wrench className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-medium">AI Tools</p>
                <p className="text-xs text-muted-foreground">14 tools available</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/history">
          <Card className="glass-card glass-card-hover cursor-pointer group h-full" data-testid="card-quick-history">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-md flex items-center justify-center bg-muted border border-border/50">
                <FolderClock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-medium">Projects</p>
                <p className="text-xs text-muted-foreground">{apps.length} total</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-medium" data-testid="text-recent-title">Recent Projects</h2>
          {apps.length > 4 && (
            <Link href="/history">
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                View all
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          )}
        </div>

        {recentApps.length === 0 ? (
          <Card className="glass-card" data-testid="card-empty-state">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-primary/5 border border-primary/10 mb-4">
                <Sparkles className="w-7 h-7 text-primary/40" />
              </div>
              <h3 className="text-sm font-heading font-medium mb-1">No projects yet</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                Create your first app using voice or text commands in the Creator.
              </p>
              <Link href="/create">
                <Button size="sm" data-testid="button-create-first">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create First App
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentApps.map((app) => {
              const Icon = appTypeIcons[app.appType || "web"] || Globe;
              return (
                <Link href={`/workspace/${app.id}`}>
                <Card key={app.id} className="glass-card hover-elevate cursor-pointer" data-testid={`card-project-${app.id}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center bg-muted/50 border border-border/50 flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-project-name-${app.id}`}>{app.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{app.prompt}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {app.appType || "web"}
                        </Badge>
                        {app.isPublished && (
                          <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                            Published
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {!user?.isPro && (
        <Card className="glass-card border-primary/10" data-testid="card-upgrade-cta">
          <CardContent className="p-6 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20 glow-cyan-subtle flex-shrink-0">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-medium">Upgrade to Pro</p>
              <p className="text-xs text-muted-foreground">
                Unlock all 14 AI tools, templates, and unlimited app generation for $19/month.
              </p>
            </div>
            <Link href="/billing">
              <Button size="sm" data-testid="button-upgrade-cta">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Upgrade
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
