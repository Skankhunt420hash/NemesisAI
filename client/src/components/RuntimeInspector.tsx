import { useState } from "react";
import { Terminal, Globe, AlertCircle, Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface LogEntry {
  id: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: Date;
  source?: string;
}

export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: number | null;
  statusText?: string;
  duration?: number;
  error?: string;
}

interface RuntimeInspectorProps {
  terminalLogs: LogEntry[];
  consoleLogs: LogEntry[];
  networkRequests: NetworkRequest[];
  previewUrl?: string;
  isServerRunning: boolean;
  onRefresh?: () => void;
  onOpenExternal?: () => void;
  onClose?: () => void;
  className?: string;
}

const logTypeStyles: Record<string, string> = {
  log: "text-foreground",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export function RuntimeInspector({
  terminalLogs,
  consoleLogs,
  networkRequests,
  previewUrl,
  isServerRunning,
  onRefresh,
  onOpenExternal,
  onClose,
  className,
}: RuntimeInspectorProps) {
  const [activeTab, setActiveTab] = useState("terminal");
  const { toast } = useToast();

  const errorCount = consoleLogs.filter(l => l.type === "error").length;
  const failedRequests = networkRequests.filter(r => r.status && r.status >= 400).length;

  const copyUrl = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      toast({ title: "URL copied to clipboard" });
    }
  };

  return (
    <div className={cn("bg-black/80 border border-border rounded-lg overflow-hidden", className)} data-testid="runtime-inspector">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Runtime Inspector</span>
          <Badge 
            variant={isServerRunning ? "default" : "destructive"} 
            className="text-xs"
          >
            {isServerRunning ? "Running" : "Stopped"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          {previewUrl && (
            <>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={copyUrl}
                title="Copy URL"
                data-testid="button-copy-url"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={onOpenExternal}
                title="Open in new tab"
                data-testid="button-open-external"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </>
          )}
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7"
            onClick={onRefresh}
            title="Refresh"
            data-testid="button-refresh-inspector"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          {onClose && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={onClose}
              data-testid="button-close-inspector"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-9">
          <TabsTrigger 
            value="terminal" 
            className="text-xs data-[state=active]:bg-muted rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            data-testid="tab-terminal"
          >
            <Terminal className="w-3 h-3 mr-1" />
            Terminal
            {terminalLogs.some(l => l.type === "error") && (
              <span className="ml-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="console" 
            className="text-xs data-[state=active]:bg-muted rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            data-testid="tab-console"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Console
            {errorCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                {errorCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="network" 
            className="text-xs data-[state=active]:bg-muted rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            data-testid="tab-network"
          >
            <Globe className="w-3 h-3 mr-1" />
            Network
            {failedRequests > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                {failedRequests}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="terminal" className="m-0 p-0">
          <LogPanel logs={terminalLogs} emptyMessage="No terminal output yet" />
        </TabsContent>
        
        <TabsContent value="console" className="m-0 p-0">
          <LogPanel logs={consoleLogs} emptyMessage="No console output yet" />
        </TabsContent>
        
        <TabsContent value="network" className="m-0 p-0">
          <NetworkPanel requests={networkRequests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogPanel({ logs, emptyMessage }: { logs: LogEntry[]; emptyMessage: string }) {
  if (logs.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-40 overflow-auto p-2 font-mono text-xs space-y-0.5">
      {logs.map((log) => (
        <div key={log.id} className={cn("flex gap-2", logTypeStyles[log.type])}>
          <span className="text-muted-foreground shrink-0">
            {log.timestamp.toLocaleTimeString()}
          </span>
          {log.source && (
            <span className="text-muted-foreground shrink-0">[{log.source}]</span>
          )}
          <span className="break-all">{log.message}</span>
        </div>
      ))}
    </div>
  );
}

function NetworkPanel({ requests }: { requests: NetworkRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        No network requests yet
      </div>
    );
  }

  return (
    <div className="h-40 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background/90 backdrop-blur">
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium">Method</th>
            <th className="text-left p-2 font-medium">URL</th>
            <th className="text-left p-2 font-medium">Status</th>
            <th className="text-left p-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr 
              key={req.id} 
              className={cn(
                "border-b border-border/50",
                req.status && req.status >= 400 && "bg-red-500/10"
              )}
            >
              <td className="p-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {req.method}
                </Badge>
              </td>
              <td className="p-2 font-mono text-muted-foreground truncate max-w-[200px]">
                {req.url}
              </td>
              <td className="p-2">
                {req.status ? (
                  <span className={cn(
                    req.status >= 400 ? "text-red-400" : "text-green-400"
                  )}>
                    {req.status}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-2 text-muted-foreground">
                {req.duration ? `${req.duration}ms` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
