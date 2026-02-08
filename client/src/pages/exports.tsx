import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Package,
  Download,
  Share2,
  Globe,
  Gamepad2,
  Glasses,
  Smartphone,
  ExternalLink,
  QrCode,
  Plus,
  FileArchive,
  Clock,
  Loader2,
} from "lucide-react";
import type { GeneratedApp } from "@shared/schema";

const appTypeIcons: Record<string, typeof Globe> = {
  web: Globe,
  "3d-game": Gamepad2,
  "vr-world": Glasses,
  native: Smartphone,
};

export default function ExportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: apps = [], isLoading } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  const publishedApps = apps.filter((a) => a.isPublished || a.isFinalized);
  const allApps = apps;

  const handleExportZip = async (app: GeneratedApp) => {
    try {
      const res = await fetch(`/api/projects/${app.id}/export/zip`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${app.name.replace(/\s+/g, "-").toLowerCase()}-v1.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: `${app.name} exported as ZIP` });
    } catch {
      toast({ title: "Export failed", description: "Could not download project", variant: "destructive" });
    }
  };

  const handleShareLink = (app: GeneratedApp) => {
    const link = `${window.location.origin}/launch/${app.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Share link copied to clipboard" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-exports-title">
            Exports & Releases
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download, share, and manage your app releases
          </p>
        </div>
        <Link href="/forge">
          <Button className="gap-2" data-testid="button-new-project">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </Link>
      </div>

      {publishedApps.length > 0 && (
        <div>
          <h2 className="text-lg font-heading font-medium mb-4" data-testid="text-published-title">Published Releases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedApps.map((app) => {
              const Icon = appTypeIcons[app.appType || "web"] || Globe;
              return (
                <Card key={app.id} className="glass-card" data-testid={`card-release-${app.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{app.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{app.appType}</Badge>
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">Published</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExportZip(app)} data-testid={`button-download-${app.id}`}>
                        <Download className="w-3 h-3" /> ZIP
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleShareLink(app)} data-testid={`button-share-${app.id}`}>
                        <Share2 className="w-3 h-3" /> Share
                      </Button>
                      <Link href={`/studio/${app.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" data-testid={`button-open-studio-${app.id}`}>
                          <ExternalLink className="w-3 h-3" /> Open
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-heading font-medium mb-4" data-testid="text-all-projects-title">All Projects</h2>
        {allApps.length === 0 ? (
          <Card className="glass-card" data-testid="card-no-projects">
            <CardContent className="p-8 text-center">
              <FileArchive className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-sm font-medium mb-1">No projects yet</h3>
              <p className="text-xs text-muted-foreground mb-4">Create a project in the Forge or Voice Studio to see it here.</p>
              <Link href="/forge">
                <Button size="sm" data-testid="button-go-to-forge">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allApps.map((app) => {
              const Icon = appTypeIcons[app.appType || "web"] || Globe;
              return (
                <Card key={app.id} className="glass-card" data-testid={`card-project-${app.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-muted/50 border border-border/50 shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{app.appType}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(app.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleExportZip(app)} data-testid={`button-export-${app.id}`}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleShareLink(app)} data-testid={`button-share-link-${app.id}`}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Link href={`/studio/${app.id}`}>
                        <Button variant="ghost" size="icon" data-testid={`button-open-${app.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
