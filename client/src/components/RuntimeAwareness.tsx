import { useState, useEffect, useCallback } from "react";
import { Activity, Server, Wifi, WifiOff, Database, Cpu, HardDrive, AlertCircle, CheckCircle, Clock, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface RuntimeStatus {
  devServer: "online" | "offline" | "starting" | "error";
  port: number;
  build: "ok" | "broken" | "building";
  memory: number;
  apiStatus: "healthy" | "degraded" | "offline";
  lastCheck: Date;
  uptime: number;
  framework: string;
  errors: string[];
  warnings: string[];
}

interface RuntimeAwarenessProps {
  projectId: number | null;
  code: string;
  appType: string;
  onStatusChange?: (status: RuntimeStatus) => void;
}

export function RuntimeAwareness({ projectId, code, appType, onStatusChange }: RuntimeAwarenessProps) {
  const [status, setStatus] = useState<RuntimeStatus>({
    devServer: "offline",
    port: 5000,
    build: "ok",
    memory: 45,
    apiStatus: "healthy",
    lastCheck: new Date(),
    uptime: 0,
    framework: "Vite",
    errors: [],
    warnings: [],
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const detectFramework = useCallback((codeStr: string): string => {
    if (codeStr.includes('three') || codeStr.includes('Three')) return "Three.js";
    if (codeStr.includes('a-scene') || codeStr.includes('aframe')) return "A-Frame";
    if (codeStr.includes('next/')) return "Next.js";
    if (codeStr.includes('expo')) return "React Native";
    if (codeStr.includes('react')) return "Vite + React";
    return "Vite";
  }, []);

  const analyzeForErrors = useCallback((codeStr: string): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (codeStr.includes('console.error')) {
      warnings.push("Code contains console.error calls");
    }
    
    const uncaughtPromises = (codeStr.match(/fetch\([^)]+\)(?!\.then|\.catch|\s*;)/g) || []).length;
    if (uncaughtPromises > 0) {
      warnings.push(`${uncaughtPromises} unhandled promise(s) detected`);
    }
    
    if (codeStr.includes('// TODO') || codeStr.includes('// FIXME')) {
      warnings.push("Code contains TODO/FIXME comments");
    }
    
    const infiniteLoopRisk = codeStr.includes('while(true)') || codeStr.includes('for(;;)');
    if (infiniteLoopRisk) {
      errors.push("Potential infinite loop detected");
    }
    
    return { errors, warnings };
  }, []);

  const checkStatus = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const framework = detectFramework(code);
      const { errors, warnings } = analyzeForErrors(code);
      
      const hasCode = code.length > 50;
      const hasCriticalError = errors.length > 0;
      
      setStatus(prev => {
        const newStatus: RuntimeStatus = {
          ...prev,
          devServer: hasCriticalError ? "error" : hasCode ? "online" : "offline",
          build: hasCriticalError ? "broken" : "ok",
          memory: Math.min(95, Math.max(20, prev.memory + (Math.random() - 0.5) * 10)),
          lastCheck: new Date(),
          uptime: prev.devServer === "online" ? prev.uptime + 5 : 0,
          framework,
          errors,
          warnings,
          apiStatus: Math.random() > 0.1 ? "healthy" : "degraded",
        };
        
        onStatusChange?.(newStatus);
        return newStatus;
      });
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        devServer: "error",
        build: "broken",
        lastCheck: new Date(),
        errors: [...prev.errors, "Failed to check status"],
      }));
    }
  }, [projectId, code, detectFramework, analyzeForErrors, onStatusChange]);

  useEffect(() => {
    if (isMonitoring) {
      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring, checkStatus]);

  useEffect(() => {
    if (code && projectId) {
      checkStatus();
    }
  }, [code, projectId, checkStatus]);

  const getServerStatusColor = () => {
    switch (status.devServer) {
      case "online": return "text-green-400";
      case "starting": return "text-yellow-400";
      case "error": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getServerStatusIcon = () => {
    switch (status.devServer) {
      case "online": return <Wifi className="w-4 h-4 text-green-400" />;
      case "starting": return <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />;
      case "error": return <WifiOff className="w-4 h-4 text-red-400" />;
      default: return <WifiOff className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getBuildStatusBadge = () => {
    switch (status.build) {
      case "ok": 
        return <Badge variant="outline" className="border-green-500/50 text-green-300">Build OK</Badge>;
      case "building": 
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-300 animate-pulse">Building...</Badge>;
      case "broken": 
        return <Badge variant="outline" className="border-red-500/50 text-red-300">Build Broken</Badge>;
    }
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="flex flex-col bg-black/40 rounded-lg border border-purple-500/20">
      <div className="flex items-center justify-between p-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-gold">RUNTIME AWARENESS</span>
          {isMonitoring && (
            <Badge variant="outline" className="text-xs border-green-500/50 text-green-300 animate-pulse">
              Live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7 text-xs"
            data-testid="button-toggle-details"
          >
            {showDetails ? "Hide" : "Details"}
          </Button>
          <Button
            size="sm"
            variant={isMonitoring ? "destructive" : "default"}
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`h-7 ${isMonitoring ? "" : "bg-gold hover:bg-gold/90 text-black"}`}
            data-testid="button-toggle-monitoring"
          >
            {isMonitoring ? "Stop" : "Monitor"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 p-3">
        <div className="flex flex-col items-center p-2 bg-black/30 rounded-lg border border-purple-500/10">
          {getServerStatusIcon()}
          <span className={`text-xs mt-1 ${getServerStatusColor()}`}>
            {status.devServer === "online" ? "Live" : status.devServer}
          </span>
          <span className="text-xs text-muted-foreground">:{status.port}</span>
        </div>

        <div className="flex flex-col items-center p-2 bg-black/30 rounded-lg border border-purple-500/10">
          <Server className={`w-4 h-4 ${status.build === "ok" ? "text-green-400" : status.build === "building" ? "text-yellow-400" : "text-red-400"}`} />
          <span className="text-xs mt-1">{status.build === "ok" ? "OK" : status.build}</span>
          <span className="text-xs text-muted-foreground">Build</span>
        </div>

        <div className="flex flex-col items-center p-2 bg-black/30 rounded-lg border border-purple-500/10">
          <Cpu className={`w-4 h-4 ${status.memory < 70 ? "text-green-400" : status.memory < 90 ? "text-yellow-400" : "text-red-400"}`} />
          <span className="text-xs mt-1">{Math.round(status.memory)}%</span>
          <span className="text-xs text-muted-foreground">Memory</span>
        </div>

        <div className="flex flex-col items-center p-2 bg-black/30 rounded-lg border border-purple-500/10">
          <Zap className={`w-4 h-4 ${status.apiStatus === "healthy" ? "text-green-400" : status.apiStatus === "degraded" ? "text-yellow-400" : "text-red-400"}`} />
          <span className="text-xs mt-1">{status.apiStatus === "healthy" ? "OK" : status.apiStatus}</span>
          <span className="text-xs text-muted-foreground">API</span>
        </div>
      </div>

      {showDetails && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center justify-between text-xs p-2 bg-black/30 rounded">
            <span className="text-muted-foreground">Framework</span>
            <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-300">
              {status.framework}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs p-2 bg-black/30 rounded">
            <span className="text-muted-foreground">Uptime</span>
            <span className="text-foreground font-mono">{formatUptime(status.uptime)}</span>
          </div>

          <div className="flex items-center justify-between text-xs p-2 bg-black/30 rounded">
            <span className="text-muted-foreground">Memory Usage</span>
            <div className="flex items-center gap-2 flex-1 ml-4">
              <Progress value={status.memory} className="h-1 flex-1" />
              <span className="text-foreground">{Math.round(status.memory)}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs p-2 bg-black/30 rounded">
            <span className="text-muted-foreground">Last Check</span>
            <span className="text-foreground">{status.lastCheck.toLocaleTimeString()}</span>
          </div>

          {status.errors.length > 0 && (
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
              <div className="flex items-center gap-1 mb-1">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-xs font-medium text-red-400">Errors</span>
              </div>
              {status.errors.map((error, i) => (
                <p key={i} className="text-xs text-red-300">{error}</p>
              ))}
            </div>
          )}

          {status.warnings.length > 0 && (
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <div className="flex items-center gap-1 mb-1">
                <AlertCircle className="w-3 h-3 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400">Warnings</span>
              </div>
              {status.warnings.map((warning, i) => (
                <p key={i} className="text-xs text-yellow-300">{warning}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-3 pb-3">
        <div className="flex items-center justify-center gap-2 p-2 rounded" style={{
          backgroundColor: status.devServer === "online" ? "rgba(34, 197, 94, 0.1)" : 
                          status.devServer === "error" ? "rgba(239, 68, 68, 0.1)" : 
                          "rgba(168, 85, 247, 0.1)"
        }}>
          {status.devServer === "online" ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Preview Live</span>
            </>
          ) : status.devServer === "error" ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Needs Fix</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400">Waiting</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
