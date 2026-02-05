import { useState, useEffect, useCallback } from "react";
import { Bot, Zap, CheckCircle, XCircle, AlertTriangle, Loader2, Play, Pause, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

export interface AgentAction {
  id: string;
  type: "detect" | "analyze" | "fix" | "verify" | "deploy";
  status: "pending" | "running" | "success" | "error";
  message: string;
  timestamp: Date;
  details?: string;
}

interface GodModeAgentProps {
  projectId: number | null;
  code: string;
  appType: string;
  onCodeFix?: (newCode: string) => void;
  onStatusChange?: (status: "idle" | "working" | "success" | "error") => void;
}

const issuePatterns = [
  { pattern: /import\s+.*\s+from\s+['"][^'"]+['"]/, check: "imports", name: "Import validation" },
  { pattern: /localhost:\d+/, check: "ports", name: "Port configuration" },
  { pattern: /<div\s+id=['"]root['"]/, check: "rootElement", name: "Root element" },
  { pattern: /className=/, check: "styling", name: "CSS classes" },
  { pattern: /useState|useEffect/, check: "hooks", name: "React hooks" },
  { pattern: /async|await|fetch/, check: "async", name: "Async operations" },
  { pattern: /onClick|onSubmit|onChange/, check: "events", name: "Event handlers" },
];

const commonFixes: Record<string, { detect: RegExp; fix: (code: string) => string; message: string }[]> = {
  imports: [
    {
      detect: /import React from ['"]react['"]/,
      fix: (code) => code,
      message: "React import is correct"
    }
  ],
  rootElement: [
    {
      detect: /document\.getElementById\(['"]root['"]\)/,
      fix: (code) => code.includes('<div id="root">') ? code : code.replace('</body>', '<div id="root"></div></body>'),
      message: "Added missing root element"
    }
  ],
  styling: [
    {
      detect: /class=/g,
      fix: (code) => code.replace(/class=/g, 'className='),
      message: "Fixed class → className for JSX"
    }
  ]
};

export function GodModeAgent({ projectId, code, appType, onCodeFix, onStatusChange }: GodModeAgentProps) {
  const [isActive, setIsActive] = useState(false);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [currentPhase, setCurrentPhase] = useState<"idle" | "detecting" | "analyzing" | "fixing" | "verifying">("idle");
  const [issuesFound, setIssuesFound] = useState(0);
  const [issuesFixed, setIssuesFixed] = useState(0);
  const [autoFix, setAutoFix] = useState(true);

  const addAction = useCallback((action: Omit<AgentAction, "id" | "timestamp">) => {
    const newAction: AgentAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setActions(prev => [...prev, newAction]);
    return newAction.id;
  }, []);

  const updateAction = useCallback((id: string, updates: Partial<AgentAction>) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const detectIssues = useCallback(async () => {
    if (!code) return [];
    
    const issues: { type: string; message: string; severity: "error" | "warning" | "info" }[] = [];
    
    if (!code.includes('<div id="root">') && !code.includes("getElementById('root')")) {
      issues.push({ type: "rootElement", message: "Missing root element for React mounting", severity: "error" });
    }
    
    if (code.includes('class=') && !code.includes('className=')) {
      issues.push({ type: "styling", message: "Using 'class' instead of 'className' in JSX", severity: "error" });
    }
    
    const unclosedTags = code.match(/<(\w+)[^>]*>(?![\s\S]*<\/\1>)/g);
    if (unclosedTags && unclosedTags.length > 0) {
      issues.push({ type: "html", message: `Potential unclosed tags detected`, severity: "warning" });
    }
    
    if (code.includes('localhost:') && !code.includes('localhost:5000')) {
      issues.push({ type: "ports", message: "Non-standard port detected, should use 5000", severity: "warning" });
    }
    
    if (!code.includes('<!DOCTYPE html>') && !code.includes('export default')) {
      issues.push({ type: "structure", message: "Missing DOCTYPE or React component export", severity: "info" });
    }
    
    return issues;
  }, [code]);

  const applyFix = useCallback((issueType: string, currentCode: string): string => {
    let fixedCode = currentCode;
    
    switch (issueType) {
      case "styling":
        fixedCode = fixedCode.replace(/\sclass=/g, ' className=');
        break;
      case "rootElement":
        if (!fixedCode.includes('<div id="root">')) {
          fixedCode = fixedCode.replace('</body>', '  <div id="root"></div>\n</body>');
        }
        break;
      case "ports":
        fixedCode = fixedCode.replace(/localhost:\d+/g, 'localhost:5000');
        break;
    }
    
    return fixedCode;
  }, []);

  const runAgentLoop = useCallback(async () => {
    if (!code || !projectId) return;
    
    onStatusChange?.("working");
    setCurrentPhase("detecting");
    
    const detectId = addAction({
      type: "detect",
      status: "running",
      message: "Scanning code for issues..."
    });
    
    await new Promise(r => setTimeout(r, 800));
    const issues = await detectIssues();
    setIssuesFound(issues.length);
    
    updateAction(detectId, {
      status: issues.length > 0 ? "success" : "success",
      message: issues.length > 0 
        ? `Found ${issues.length} issue${issues.length > 1 ? 's' : ''}`
        : "No issues detected",
      details: issues.map(i => `• ${i.message}`).join('\n')
    });
    
    if (issues.length === 0) {
      setCurrentPhase("idle");
      onStatusChange?.("success");
      return;
    }
    
    setCurrentPhase("analyzing");
    const analyzeId = addAction({
      type: "analyze",
      status: "running",
      message: "Analyzing issues and planning fixes..."
    });
    
    await new Promise(r => setTimeout(r, 600));
    updateAction(analyzeId, {
      status: "success",
      message: `Analyzed ${issues.length} issues, ${autoFix ? 'applying fixes' : 'manual fixes needed'}`
    });
    
    if (autoFix) {
      setCurrentPhase("fixing");
      let fixedCode = code;
      let fixCount = 0;
      
      for (const issue of issues) {
        const fixId = addAction({
          type: "fix",
          status: "running",
          message: `Fixing: ${issue.message}`
        });
        
        await new Promise(r => setTimeout(r, 400));
        const newCode = applyFix(issue.type, fixedCode);
        
        if (newCode !== fixedCode) {
          fixedCode = newCode;
          fixCount++;
          updateAction(fixId, { status: "success", message: `Fixed: ${issue.message}` });
        } else {
          updateAction(fixId, { status: "error", message: `Could not auto-fix: ${issue.message}` });
        }
      }
      
      setIssuesFixed(fixCount);
      
      if (fixedCode !== code) {
        onCodeFix?.(fixedCode);
      }
      
      setCurrentPhase("verifying");
      const verifyId = addAction({
        type: "verify",
        status: "running",
        message: "Verifying fixes..."
      });
      
      await new Promise(r => setTimeout(r, 500));
      const remainingIssues = await detectIssues();
      
      if (remainingIssues.length < issues.length) {
        updateAction(verifyId, {
          status: "success",
          message: `Verification complete: ${fixCount} fixes applied successfully`
        });
        onStatusChange?.("success");
      } else {
        updateAction(verifyId, {
          status: "error",
          message: "Some issues could not be automatically fixed"
        });
        onStatusChange?.("error");
      }
    }
    
    setCurrentPhase("idle");
  }, [code, projectId, autoFix, addAction, updateAction, detectIssues, applyFix, onCodeFix, onStatusChange]);

  useEffect(() => {
    if (isActive && code && projectId) {
      const timeout = setTimeout(() => {
        runAgentLoop();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isActive, code, projectId, runAgentLoop]);

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case "detecting": return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
      case "analyzing": return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case "fixing": return <Loader2 className="w-4 h-4 animate-spin text-purple-400" />;
      case "verifying": return <Loader2 className="w-4 h-4 animate-spin text-green-400" />;
      default: return isActive ? <Bot className="w-4 h-4 text-gold" /> : <Bot className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionIcon = (action: AgentAction) => {
    switch (action.status) {
      case "running": return <Loader2 className="w-3 h-3 animate-spin" />;
      case "success": return <CheckCircle className="w-3 h-3 text-green-400" />;
      case "error": return <XCircle className="w-3 h-3 text-red-400" />;
      default: return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-lg border border-purple-500/20">
      <div className="flex items-center justify-between p-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          {getPhaseIcon()}
          <span className="text-sm font-medium text-gold">GOD-MODE AGENT</span>
          {currentPhase !== "idle" && (
            <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
              {currentPhase}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-Fix</span>
            <Switch
              checked={autoFix}
              onCheckedChange={setAutoFix}
              className="data-[state=checked]:bg-gold"
              data-testid="switch-autofix"
            />
          </div>
          <Button
            size="sm"
            variant={isActive ? "destructive" : "default"}
            onClick={() => setIsActive(!isActive)}
            className={isActive ? "" : "bg-gold hover:bg-gold/90 text-black"}
            data-testid="button-toggle-godmode"
          >
            {isActive ? (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 mr-1" />
                Activate
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 px-3 py-2 border-b border-purple-500/10 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Issues:</span>
          <span className="text-yellow-400 font-medium">{issuesFound}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Fixed:</span>
          <span className="text-green-400 font-medium">{issuesFixed}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Status:</span>
          <span className={currentPhase === "idle" ? "text-muted-foreground" : "text-gold"}>
            {currentPhase === "idle" ? (isActive ? "Monitoring" : "Inactive") : currentPhase}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Bot className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isActive ? "Monitoring for issues..." : "Activate to start autonomous building"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-2 p-2 rounded bg-black/30 border border-purple-500/10"
              >
                <div className="mt-0.5">{getActionIcon(action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{action.message}</p>
                  {action.details && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {action.details}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {action.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
