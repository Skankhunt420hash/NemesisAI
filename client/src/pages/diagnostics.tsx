import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Key,
  Shield,
  CreditCard,
  Server,
  Loader2,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface DiagnosticCheck {
  status: "ok" | "warning" | "error";
  message: string;
}

interface DiagnosticsData {
  overall: "ok" | "warning" | "error";
  checks: Record<string, DiagnosticCheck>;
  timestamp: string;
}

const checkIcons: Record<string, typeof Database> = {
  database: Database,
  openai: Key,
  session: Shield,
  stripe: CreditCard,
  env: Server,
};

const checkLabels: Record<string, string> = {
  database: "PostgreSQL Database",
  openai: "OpenAI API",
  session: "Session Security",
  stripe: "Stripe Payments",
  env: "Environment Variables",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (status === "warning") return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  return <XCircle className="w-5 h-5 text-destructive" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ok") return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Healthy</Badge>;
  if (status === "warning") return <Badge variant="outline" className="text-amber-400 border-amber-400/30">Warning</Badge>;
  return <Badge variant="outline" className="text-destructive border-destructive/30">Error</Badge>;
}

export default function DiagnosticsPage() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery<DiagnosticsData>({
    queryKey: ["/api/diagnostics"],
    refetchInterval: 30000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/diagnostics"] });
  };

  if (!user?.isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="diagnostics-page">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-diagnostics-title">
              System Diagnostics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time health checks for all system components
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && <StatusBadge status={data.overall} />}
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} data-testid="button-refresh-diagnostics">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <Card className="glass-card border-destructive/30">
            <CardContent className="p-6 text-center">
              <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-sm text-destructive">Failed to load diagnostics. Check server logs.</p>
            </CardContent>
          </Card>
        )}

        {data && (
          <div className="space-y-3">
            {Object.entries(data.checks).map(([key, check]) => {
              const Icon = checkIcons[key] || Server;
              const label = checkLabels[key] || key;
              return (
                <Card key={key} className="glass-card" data-testid={`diagnostic-${key}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center bg-muted/30 border border-border/30 shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                    </div>
                    <StatusIcon status={check.status} />
                  </CardContent>
                </Card>
              );
            })}

            <div className="text-xs text-muted-foreground text-center pt-2">
              Last checked: {new Date(data.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
