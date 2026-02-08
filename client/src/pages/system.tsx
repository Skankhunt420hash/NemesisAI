import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useReady } from "@/lib/ready";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Server,
  Database,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Wrench,
  RotateCcw,
  Trash2,
  Bug,
  FileSearch,
  Zap,
  Clock,
  Heart,
} from "lucide-react";

interface ServiceStatus {
  name: string;
  status: "ok" | "warning" | "error" | "unknown";
  message: string;
  icon: typeof Server;
}

interface DiagCheck {
  status: "ok" | "warning" | "error";
  message: string;
}

export default function SystemPage() {
  const { user } = useAuth();
  const { isReady, errors, version } = useReady();
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = useState<Record<string, DiagCheck> | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [healthLogs, setHealthLogs] = useState<Array<{ time: string; message: string; level: string }>>([]);

  const fetchDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    try {
      const res = await fetch("/api/diagnostics", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data.checks);
        setHealthLogs((prev) => [
          { time: new Date().toLocaleTimeString(), message: `Diagnostics: ${data.overall}`, level: data.overall },
          ...prev.slice(0, 49),
        ]);
      } else if (res.status === 403) {
        toast({ title: "Access Denied", description: "Admin access required for diagnostics", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch diagnostics", variant: "destructive" });
    } finally {
      setDiagLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.isAdmin) fetchDiagnostics();
  }, [user?.isAdmin, fetchDiagnostics]);

  const services: ServiceStatus[] = [
    {
      name: "Web Server",
      status: isReady ? "ok" : "error",
      message: isReady ? "Running on port 5000" : "Not ready",
      icon: Globe,
    },
    {
      name: "API Server",
      status: isReady ? "ok" : "error",
      message: isReady ? "Healthy" : errors.join(", ") || "Unreachable",
      icon: Server,
    },
    {
      name: "Database",
      status: diagnostics?.database?.status || (isReady ? "ok" : "unknown"),
      message: diagnostics?.database?.message || (isReady ? "Connected" : "Unknown"),
      icon: Database,
    },
    {
      name: "AI Engine",
      status: diagnostics?.openai?.status || "unknown",
      message: diagnostics?.openai?.message || "Check diagnostics",
      icon: Zap,
    },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "error": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ok": return "border-emerald-500/30 text-emerald-400";
      case "warning": return "border-amber-500/30 text-amber-400";
      case "error": return "border-destructive/30 text-destructive";
      default: return "";
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-system-title">
            System & Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor services, debug issues, and manage self-healing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${isReady ? "border-emerald-500/30 text-emerald-400" : "border-destructive/30 text-destructive"}`} data-testid="badge-system-status">
            {isReady ? "All Systems Operational" : "Issues Detected"}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchDiagnostics} disabled={diagLoading} data-testid="button-refresh-diagnostics">
            {diagLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => (
          <Card key={svc.name} className="glass-card" data-testid={`card-service-${svc.name.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-muted/50 border border-border/50">
                  <svc.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                {statusIcon(svc.status)}
              </div>
              <p className="text-sm font-medium">{svc.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{svc.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList data-testid="tabs-system">
          <TabsTrigger value="health" className="gap-1.5" data-testid="tab-health">
            <Heart className="w-3.5 h-3.5" /> Self-Healing
          </TabsTrigger>
          <TabsTrigger value="bugs" className="gap-1.5" data-testid="tab-bugs">
            <Bug className="w-3.5 h-3.5" /> Bug Hunter
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5" data-testid="tab-logs">
            <FileSearch className="w-3.5 h-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Self-Healing Controls
              </CardTitle>
              <CardDescription>Manage automatic recovery and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start gap-2" data-testid="button-restart-services">
                  <RefreshCw className="w-4 h-4" /> Restart Services
                </Button>
                <Button variant="outline" className="justify-start gap-2" data-testid="button-repair-now">
                  <Wrench className="w-4 h-4" /> Repair Now
                </Button>
                <Button variant="outline" className="justify-start gap-2" data-testid="button-clear-cache">
                  <Trash2 className="w-4 h-4" /> Clear Cache
                </Button>
                <Button variant="outline" className="justify-start gap-2" data-testid="button-rollback">
                  <RotateCcw className="w-4 h-4" /> Rollback
                </Button>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Auto-restart policy: Docker restart=unless-stopped. Safe Mode activates when health checks fail.
                  Version: {version}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bug className="w-5 h-5 text-amber-400" />
                Bug Hunter Vision
              </CardTitle>
              <CardDescription>AI-powered issue detection and fix suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bug className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-2">No issues detected</p>
                <p className="text-xs text-muted-foreground">
                  Bug Hunter analyzes preview logs and errors to suggest patches.
                  Open a project in Studio to enable real-time analysis.
                </p>
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={fetchDiagnostics} data-testid="button-scan-now">
                  <FileSearch className="w-4 h-4" /> Scan Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                System Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-1 font-mono text-xs">
                  {healthLogs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No logs yet. Run a diagnostic scan.</p>
                  ) : (
                    healthLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                        <span className={log.level === "error" ? "text-destructive" : log.level === "warning" ? "text-amber-400" : "text-emerald-400"}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {diagnostics && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Detailed Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(diagnostics).map(([key, check]) => (
                <div key={key} className="flex items-center gap-3">
                  {statusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{key}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColor(check.status)}`}>
                    {check.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
