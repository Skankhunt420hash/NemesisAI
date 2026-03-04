import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Database,
  Key,
  Globe,
  Shield,
  Settings,
  ArrowRight,
  Server,
  Zap,
} from "lucide-react";

interface EnvCheck {
  key: string;
  label: string;
  required: boolean;
  icon: typeof Key;
  hint: string;
}

const envChecks: EnvCheck[] = [
  { key: "DATABASE_URL", label: "Database URL", required: true, icon: Database, hint: "PostgreSQL connection string" },
  { key: "SESSION_SECRET", label: "Session Secret", required: true, icon: Shield, hint: "Random string for session encryption" },
  { key: "OPENAI_API_KEY", label: "OpenAI API Key", required: false, icon: Zap, hint: "Required for AI code generation" },
  { key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", required: false, icon: Key, hint: "Required for payment processing" },
  { key: "APP_DOMAIN", label: "App Domain", required: false, icon: Globe, hint: "Your domain (e.g., nemesis.example.com)" },
  { key: "SELF_HOST_OPEN_ACCESS", label: "Self-Host Open Access", required: false, icon: Settings, hint: "Unlocks Pro features for all logged-in users" },
];

export default function SetupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [readyData, setReadyData] = useState<any>(null);
  const [diagData, setDiagData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [readyRes, diagRes] = await Promise.all([
        fetch("/api/ready"),
        user?.isAdmin ? fetch("/api/diagnostics", { credentials: "include" }) : Promise.resolve(null),
      ]);

      if (readyRes.ok || readyRes.status === 503) {
        setReadyData(await readyRes.json());
      }

      if (diagRes && (diagRes as Response).ok) {
        setDiagData(await (diagRes as Response).json());
      }
    } catch {
      toast({ title: "Error", description: "Could not check server status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.isAdmin, toast]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const getEnvStatus = (key: string) => {
    if (!readyData) return "unknown";
    if (key === "DATABASE_URL" || key === "SESSION_SECRET" || key === "APP_DOMAIN" || key === "SELF_HOST_OPEN_ACCESS") {
      return readyData.checks?.environment?.[key] ? "ok" : "missing";
    }
    if (diagData?.checks) {
      if (key === "OPENAI_API_KEY") return diagData.checks.openai?.status === "ok" ? "ok" : "missing";
      if (key === "STRIPE_SECRET_KEY") return diagData.checks.stripe?.status === "ok" ? "ok" : "missing";
    }
    return "unknown";
  };

  const allRequiredOk = envChecks
    .filter((c) => c.required)
    .every((c) => getEnvStatus(c.key) === "ok");

  const statusIcon = (status: string) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "missing": return <XCircle className="w-5 h-5 text-destructive" />;
      default: return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-setup-title">
          Setup Wizard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify your environment configuration. All required keys must be set before the platform is fully operational.
        </p>
      </div>

      <Card className={`glass-card ${allRequiredOk ? "border-emerald-500/20" : "border-amber-500/20"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Server Status
          </CardTitle>
          <CardDescription>
            {readyData?.status === "ready" ? "Server is ready and all required services are connected." : "Some checks failed. Review the items below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            {readyData?.status === "ready" ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Ready</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/30 text-amber-400">Not Ready</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Database: {readyData?.checks?.database || "Unknown"} | Schema: {readyData?.checks?.schema || "Unknown"} | Version: {readyData?.version || "?"}
            </span>
          </div>

          {readyData?.errors?.length > 0 && (
            <div className="bg-destructive/10 rounded-md p-3 mb-4">
              {readyData.errors.map((err: string, i: number) => (
                <p key={i} className="text-xs text-destructive">{err}</p>
              ))}
            </div>
          )}

          {Array.isArray(readyData?.missingTables) && readyData.missingTables.length > 0 && (
            <div className="bg-amber-500/10 rounded-md p-3 mb-4">
              <p className="text-xs text-amber-300 font-medium mb-1">Missing DB tables detected:</p>
              <p className="text-xs text-amber-200">{readyData.missingTables.join(", ")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Environment Variables
          </CardTitle>
          <CardDescription>Required and optional configuration keys</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {envChecks.map((check) => {
                const status = getEnvStatus(check.key);
                return (
                  <div key={check.key} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0" data-testid={`env-check-${check.key.toLowerCase()}`}>
                    {statusIcon(status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{check.label}</p>
                        {check.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                        {!check.required && <Badge variant="outline" className="text-[10px] text-muted-foreground">Optional</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{check.hint}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        status === "ok" ? "border-emerald-500/30 text-emerald-400" :
                        status === "missing" ? "border-destructive/30 text-destructive" :
                        "border-muted text-muted-foreground"
                      }`}
                    >
                      {status === "ok" ? "Configured" : status === "missing" ? "Missing" : "Unknown"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button variant="outline" onClick={checkStatus} disabled={loading} className="gap-2" data-testid="button-recheck">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Re-check
        </Button>
        {allRequiredOk && (
          <Link href="/forge">
            <Button className="gap-2" data-testid="button-continue-to-forge">
              Continue to Forge <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
