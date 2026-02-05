import { useState, useEffect, useRef } from "react";
import { Loader2, AlertTriangle, RefreshCw, Wrench, ExternalLink, Copy, Maximize2, Minimize2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export type PreviewStatus = "idle" | "installing" | "starting" | "running" | "error" | "crashed";

export interface PreviewError {
  type: "crash" | "timeout" | "network" | "build" | "runtime";
  message: string;
  logs?: string[];
}

interface PreviewPanelProps {
  code: string;
  appType: string;
  status: PreviewStatus;
  error?: PreviewError;
  previewUrl?: string;
  statusMessage?: string;
  onFixPreview?: () => void;
  onRestart?: () => void;
  onToggleInspector?: () => void;
  showInspector?: boolean;
  className?: string;
}

const statusConfig: Record<PreviewStatus, { label: string; color: string; icon?: React.ReactNode }> = {
  idle: { label: "Ready", color: "text-muted-foreground" },
  installing: { label: "Installing dependencies...", color: "text-yellow-400", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  starting: { label: "Starting dev server...", color: "text-blue-400", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  running: { label: "Running", color: "text-green-400" },
  error: { label: "Error", color: "text-red-400", icon: <AlertTriangle className="w-4 h-4" /> },
  crashed: { label: "Crashed", color: "text-red-400", icon: <AlertTriangle className="w-4 h-4" /> },
};

export function PreviewPanel({
  code,
  appType,
  status,
  error,
  previewUrl,
  statusMessage,
  onFixPreview,
  onRestart,
  onToggleInspector,
  showInspector,
  className,
}: PreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const config = statusConfig[status];

  const refreshPreview = () => {
    setIframeKey(prev => prev + 1);
  };

  const copyUrl = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      toast({ title: "Preview URL copied" });
    }
  };

  const openExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  const renderIframe = () => {
    if (!code) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center space-y-2">
            <div className="text-6xl">🚀</div>
            <p className="text-muted-foreground">Start building to see preview</p>
          </div>
        </div>
      );
    }

    if (status === "installing" || status === "starting") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div className="space-y-1">
              <p className="text-lg font-medium">{statusMessage || config.label}</p>
              <p className="text-sm text-muted-foreground">This may take a moment...</p>
            </div>
          </div>
        </div>
      );
    }

    if (status === "error" || status === "crashed") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
          <div className="max-w-md w-full space-y-4">
            <div className="text-center space-y-2">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold text-red-400">
                {status === "crashed" ? "Dev Server Crashed" : "Preview Error"}
              </h3>
              <p className="text-sm text-muted-foreground">{error?.message || "Something went wrong"}</p>
            </div>
            
            {error?.logs && error.logs.length > 0 && (
              <div className="bg-black/50 rounded-lg p-3 max-h-40 overflow-auto border border-red-500/30">
                <p className="text-xs text-muted-foreground mb-2">Last logs:</p>
                <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap">
                  {error.logs.slice(-30).join("\n")}
                </pre>
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              {onRestart && (
                <Button variant="outline" onClick={onRestart} data-testid="button-restart-preview">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart
                </Button>
              )}
              {onFixPreview && (
                <Button onClick={onFixPreview} className="bg-primary" data-testid="button-fix-preview">
                  <Wrench className="w-4 h-4 mr-2" />
                  Fix Automatically
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <iframe
        key={iframeKey}
        ref={iframeRef}
        srcDoc={code}
        className="absolute inset-0 w-full h-full bg-white"
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        title="Preview"
        data-testid="preview-iframe"
      />
    );
  };

  return (
    <div 
      className={cn(
        "flex flex-col bg-background border-l border-border",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      data-testid="preview-panel"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          <Badge variant="outline" className="text-xs">
            {appType.toUpperCase()}
          </Badge>
          <div className={cn("flex items-center gap-1 text-xs", config.color)}>
            {config.icon}
            <span>{statusMessage || config.label}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {status === "running" && (
            <>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={copyUrl}
                title="Copy URL"
                data-testid="button-copy-preview-url"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={openExternal}
                title="Open in new tab"
                data-testid="button-open-preview-external"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={refreshPreview}
                title="Refresh"
                data-testid="button-refresh-preview"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </>
          )}
          <Button 
            size="icon" 
            variant="ghost" 
            className={cn("h-7 w-7", showInspector && "bg-muted")}
            onClick={onToggleInspector}
            title="Toggle Inspector"
            data-testid="button-toggle-inspector"
          >
            <Terminal className="w-3 h-3" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            data-testid="button-fullscreen-preview"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        {renderIframe()}
      </div>
    </div>
  );
}
