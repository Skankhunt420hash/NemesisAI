import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Library,
  Globe,
  Gamepad2,
  Glasses,
  Smartphone,
  ExternalLink,
  Code,
  Trash2,
  Crown,
  Sparkles,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import type { GeneratedApp } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

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

export default function ArchivePage() {
  const { user } = useAuth();
  const [previewApp, setPreviewApp] = useState<GeneratedApp | null>(null);

  const { data: apps = [], isLoading } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  const publishedApps = apps.filter(app => app.isPublished);
  const draftApps = apps.filter(app => !app.isPublished);

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      return apiRequest("PATCH", `/api/apps/${id}`, { isPublished });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
    },
  });

  const canAccess = user?.isAdmin || user?.isPro;

  const renderPreview = (app: GeneratedApp) => {
    const language = app.language;
    
    if (language === "react" || language === "javascript" || language === "html" || language === "threejs" || language === "aframe") {
      let htmlContent = "";
      
      if (language === "aframe") {
        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
</head>
<body>
  ${app.generatedCode}
</body>
</html>`;
      } else if (language === "threejs") {
        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/three@0.157.0/build/three.min.js"></script>
  <style>
    body { margin: 0; overflow: hidden; background: #0a0a0a; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>
    ${app.generatedCode}
  </script>
</body>
</html>`;
      } else {
        htmlContent = language === "html" 
          ? app.generatedCode 
          : `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0a0a0a; color: #fff; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${app.generatedCode}
    
    if (typeof App !== 'undefined') {
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    }
  </script>
</body>
</html>`;
      }
      
      return (
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-0 rounded-md bg-black"
          sandbox="allow-scripts"
          title="App Preview"
        />
      );
    }
    
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Preview not available</p>
        </div>
      </div>
    );
  };

  const AppCard = ({ app, showPublishToggle = false }: { app: GeneratedApp; showPublishToggle?: boolean }) => {
    const IconComponent = appTypeIcons[app.appType || "web"] || Globe;
    
    return (
      <div className="forge-card p-5 group" data-testid={`archive-app-${app.id}`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-700/20 flex items-center justify-center neon-purple-border">
            <IconComponent className="w-6 h-6 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{app.name}</h3>
              {app.isPublished && (
                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                  Published
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{app.prompt}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {appTypeLabels[app.appType || "web"]}
              </Badge>
              <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                {app.language}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-violet-500/10">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPreviewApp(app)}
                data-testid={`button-preview-${app.id}`}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh]">
              <DialogHeader>
                <DialogTitle>{app.name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 h-full min-h-[60vh] rounded-lg border border-violet-500/20 overflow-hidden">
                {previewApp && renderPreview(previewApp)}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Launch Button - Opens live app in new tab */}
          <a
            href={`/launch/${app.id}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`button-launch-${app.id}`}
          >
            <Button
              variant="outline"
              size="sm"
              className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Launch
            </Button>
          </a>
          
          {showPublishToggle && (
            <Button
              variant={app.isPublished ? "secondary" : "default"}
              size="sm"
              onClick={() => togglePublishMutation.mutate({ id: app.id, isPublished: !app.isPublished })}
              disabled={togglePublishMutation.isPending}
              data-testid={`button-publish-${app.id}`}
            >
              {app.isPublished ? "Unpublish" : "Publish"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen obsidian-bg pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gold-gradient mb-6 neon-purple-glow">
            <Library className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
            The Archive
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your collection of created applications
          </p>
        </div>

        {!canAccess && (
          <div className="text-center mb-8">
            <Link href="/pricing">
              <Button variant="outline" className="gap-2 neon-purple-border" data-testid="button-upgrade">
                <Crown className="w-4 h-4" />
                Upgrade to Pro for Full Access
              </Button>
            </Link>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No Apps Yet</h3>
            <p className="text-muted-foreground mb-6">Create your first app in The Forge</p>
            <Link href="/forge">
              <Button className="gap-2" data-testid="button-go-to-forge">
                <Sparkles className="w-4 h-4" />
                Open The Forge
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {publishedApps.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-green-400" />
                  Published
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {publishedApps.map(app => (
                    <AppCard key={app.id} app={app} showPublishToggle={canAccess} />
                  ))}
                </div>
              </section>
            )}

            {draftApps.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-violet-400" />
                  Drafts
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {draftApps.map(app => (
                    <AppCard key={app.id} app={app} showPublishToggle={canAccess} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
