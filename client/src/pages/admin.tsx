import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Redirect } from "wouter";
import {
  ShieldCheck,
  Users,
  FolderClock,
  Crown,
  Loader2,
  BarChart3,
} from "lucide-react";
import type { GeneratedApp } from "@shared/schema";

export default function AdminPage() {
  const { user } = useAuth();

  const { data: apps = [], isLoading } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  if (!user?.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const publishedCount = apps.filter((a) => a.isPublished).length;
  const draftCount = apps.filter((a) => !a.isPublished).length;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md flex items-center justify-center bg-red-500/10 border border-red-500/20">
          <ShieldCheck className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-admin-title">
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground">System overview and management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card" data-testid="card-stat-projects">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20">
                <FolderClock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold" data-testid="text-total-projects">{apps.length}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card" data-testid="card-stat-published">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center bg-green-500/10 border border-green-500/20">
                <Users className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold" data-testid="text-published-count">{publishedCount}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card" data-testid="card-stat-drafts">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                <BarChart3 className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold" data-testid="text-draft-count">{draftCount}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card" data-testid="card-admin-projects">
        <CardHeader>
          <CardTitle className="font-heading text-lg">All Projects</CardTitle>
          <CardDescription>Complete project listing with admin controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/20 border border-border/30"
                data-testid={`admin-project-${app.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{app.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.prompt}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {app.appType || "web"}
                  </Badge>
                  {app.isPublished ? (
                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-muted-foreground/30">
                      Draft
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
