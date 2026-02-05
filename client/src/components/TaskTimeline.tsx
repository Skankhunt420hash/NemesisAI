import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ChevronDown, ChevronRight, FileCode, Package, Terminal, Globe, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TaskStatus = "pending" | "running" | "success" | "warning" | "error";

export interface TaskStep {
  id: string;
  title: string;
  status: TaskStatus;
  icon: "file" | "package" | "terminal" | "globe" | "wrench";
  details?: string;
  files?: string[];
  logs?: string[];
  timestamp?: Date;
}

interface TaskTimelineProps {
  steps: TaskStep[];
  onRetryStep?: (stepId: string) => void;
  className?: string;
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />,
  running: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  file: <FileCode className="w-4 h-4" />,
  package: <Package className="w-4 h-4" />,
  terminal: <Terminal className="w-4 h-4" />,
  globe: <Globe className="w-4 h-4" />,
  wrench: <Wrench className="w-4 h-4" />,
};

export function TaskTimeline({ steps, onRetryStep, className }: TaskTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleExpand = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const hasDetails = (step: TaskStep) => step.details || step.files?.length || step.logs?.length;

  return (
    <div className={cn("space-y-1", className)} data-testid="task-timeline">
      {steps.map((step, index) => {
        const isExpanded = expandedSteps.has(step.id);
        const showDetails = hasDetails(step);
        
        return (
          <div key={step.id} className="relative" data-testid={`task-step-${step.id}`}>
            {index < steps.length - 1 && (
              <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
            )}
            
            <div 
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg transition-colors",
                showDetails && "cursor-pointer hover-elevate",
                step.status === "error" && "bg-red-500/10",
                step.status === "warning" && "bg-yellow-500/10"
              )}
              onClick={() => showDetails && toggleExpand(step.id)}
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                {statusIcons[step.status]}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {typeIcons[step.icon]}
                  </span>
                  <span className={cn(
                    "text-sm font-medium truncate",
                    step.status === "error" && "text-red-400",
                    step.status === "warning" && "text-yellow-400",
                    step.status === "success" && "text-foreground"
                  )}>
                    {step.title}
                  </span>
                  {showDetails && (
                    <span className="text-muted-foreground">
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                  )}
                </div>
                
                {step.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {step.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {step.status === "error" && onRetryStep && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryStep(step.id);
                  }}
                  data-testid={`button-retry-${step.id}`}
                >
                  Retry
                </Button>
              )}
            </div>
            
            {isExpanded && showDetails && (
              <div className="ml-9 mt-1 mb-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                {step.details && (
                  <p className="text-xs text-muted-foreground">{step.details}</p>
                )}
                
                {step.files && step.files.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {step.files.map((file, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs font-mono"
                      >
                        {file}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {step.logs && step.logs.length > 0 && (
                  <div className="bg-black/50 rounded p-2 max-h-32 overflow-auto">
                    <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                      {step.logs.join("\n")}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function createInitialSteps(appType: string): TaskStep[] {
  return [
    {
      id: "scaffold",
      title: `Creating ${appType} project scaffold`,
      status: "pending",
      icon: "file",
    },
    {
      id: "dependencies",
      title: "Installing dependencies",
      status: "pending",
      icon: "package",
    },
    {
      id: "generate",
      title: "Generating components",
      status: "pending",
      icon: "file",
    },
    {
      id: "server",
      title: "Starting dev server",
      status: "pending",
      icon: "terminal",
    },
    {
      id: "preview",
      title: "Connecting preview",
      status: "pending",
      icon: "globe",
    },
  ];
}
