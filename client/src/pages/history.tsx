import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  Gamepad2,
  Glasses,
  Smartphone,
  ExternalLink,
  Eye,
  Trash2,
  Lock,
  Users,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import type { GeneratedApp } from "@shared/schema";

const appTypeIcons: Record<string, typeof Globe> = {
  web: Globe,
  "3d-game": Gamepad2,
  "vr-world": Glasses,
  native: Smartphone,
};

const appTypeLabels: Record<string, string> = {
  web: "Web App",
  "3d-game": "3D Game",
  "vr-world": "VR World",
  native: "Native App",
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [previewApp, setPreviewApp] = useState<GeneratedApp | null>(null);

  const { data: apps = [], isLoading } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      return apiRequest("PATCH", `/api/apps/${id}`, { isPublished });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-history-title">
          Project History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your created apps in one place. {apps.length} projects total.
        </p>
      </div>

      {apps.length === 0 ? (
        <Card className="glass-card" data-testid="card-no-projects">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No projects yet. Start building in the Creator.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {apps.map((app) => {
            const Icon = appTypeIcons[app.appType || "web"] || Globe;
            return (
              <Card key={app.id} className="glass-card" data-testid={`card-history-${app.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center bg-muted/50 border border-border/50 flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-app-name-${app.id}`}>{app.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{app.prompt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {appTypeLabels[app.appType || "web"] || "Web App"}
                    </Badge>
                    {app.isPublished ? (
                      <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400 gap-1">
                        <Users className="w-2.5 h-2.5" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400 gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Private
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewApp(app)}
                      data-testid={`button-preview-${app.id}`}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Preview
                    </Button>
                    {app.viewToken && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/launch/${app.id}`, "_blank")}
                        data-testid={`button-launch-${app.id}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Launch
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        togglePublishMutation.mutate({
                          id: app.id,
                          isPublished: !app.isPublished,
                        })
                      }
                      data-testid={`button-toggle-publish-${app.id}`}
                    >
                      {app.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewApp} onOpenChange={() => setPreviewApp(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-heading">{previewApp?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-md border border-border/50">
            {previewApp?.generatedCode && (
              <iframe
                srcDoc={previewApp.generatedCode}
                className="w-full h-full border-0 bg-black"
                sandbox="allow-scripts"
                title="Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
