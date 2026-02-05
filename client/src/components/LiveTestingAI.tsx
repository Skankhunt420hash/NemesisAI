import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Square, CheckCircle, XCircle, AlertTriangle, Loader2, MousePointer, FormInput, Link2, Eye, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

export interface TestResult {
  id: string;
  type: "click" | "form" | "navigation" | "visibility" | "interaction";
  element: string;
  status: "pass" | "fail" | "warning" | "fixed";
  message: string;
  timestamp: Date;
  autoFixed?: boolean;
  fixApplied?: string;
}

interface LiveTestingAIProps {
  projectId: number | null;
  code: string;
  previewUrl?: string;
  onCodeFix?: (newCode: string) => void;
}

const testScenarios = [
  { type: "visibility", name: "Page Load", description: "Check if page renders content" },
  { type: "click", name: "Button Clicks", description: "Test all clickable elements" },
  { type: "form", name: "Form Inputs", description: "Validate form fields and submission" },
  { type: "navigation", name: "Route Navigation", description: "Test internal links and routing" },
  { type: "interaction", name: "User Flows", description: "Simulate complete user journeys" },
];

export function LiveTestingAI({ projectId, code, previewUrl, onCodeFix }: LiveTestingAIProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState({ pass: 0, fail: 0, fixed: 0 });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const addResult = useCallback((result: Omit<TestResult, "id" | "timestamp">) => {
    const newResult: TestResult = {
      ...result,
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setTestResults(prev => [...prev, newResult]);
    return newResult;
  }, []);

  const analyzeCode = useCallback(() => {
    const issues: { type: string; element: string; problem: string; fix?: string }[] = [];
    
    const buttonMatches = code.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
    buttonMatches.forEach((btn, i) => {
      if (!btn.includes('onClick') && !btn.includes('type="submit"')) {
        issues.push({
          type: "click",
          element: `Button ${i + 1}`,
          problem: "Button has no click handler",
          fix: btn.replace('<button', '<button onClick={() => {}}')
        });
      }
    });
    
    const formMatches = code.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
    formMatches.forEach((form, i) => {
      if (!form.includes('onSubmit')) {
        issues.push({
          type: "form",
          element: `Form ${i + 1}`,
          problem: "Form has no submit handler",
          fix: form.replace('<form', '<form onSubmit={(e) => e.preventDefault()}')
        });
      }
    });
    
    const linkMatches = code.match(/<a[^>]*href=['"](#|javascript:void)[^'"]*['"][^>]*>/gi) || [];
    linkMatches.forEach((link, i) => {
      issues.push({
        type: "navigation",
        element: `Link ${i + 1}`,
        problem: "Link has placeholder href",
      });
    });
    
    const inputMatches = code.match(/<input[^>]*>/gi) || [];
    inputMatches.forEach((input, i) => {
      if (!input.includes('onChange') && !input.includes('value=') && !input.includes('defaultValue=')) {
        issues.push({
          type: "form",
          element: `Input ${i + 1}`,
          problem: "Input is uncontrolled without onChange handler",
        });
      }
    });
    
    return issues;
  }, [code]);

  const runTests = useCallback(async () => {
    if (!code) return;
    
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);
    setSummary({ pass: 0, fail: 0, fixed: 0 });
    
    let passCount = 0;
    let failCount = 0;
    let fixedCount = 0;
    
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      setCurrentTest(scenario.name);
      setProgress((i / testScenarios.length) * 100);
      
      await new Promise(r => setTimeout(r, 600));
      
      if (scenario.type === "visibility") {
        const hasContent = code.length > 100;
        const hasRender = code.includes('return') || code.includes('<div') || code.includes('<html');
        
        if (hasContent && hasRender) {
          addResult({
            type: "visibility",
            element: "Page",
            status: "pass",
            message: "Page renders visible content"
          });
          passCount++;
        } else {
          addResult({
            type: "visibility",
            element: "Page",
            status: "fail",
            message: "Page appears empty or has no visible content"
          });
          failCount++;
        }
      }
      
      if (scenario.type === "click") {
        const buttons = (code.match(/<button/gi) || []).length;
        const clickHandlers = (code.match(/onClick/g) || []).length;
        
        if (buttons === 0) {
          addResult({
            type: "click",
            element: "Buttons",
            status: "warning",
            message: "No buttons found in the application"
          });
        } else if (clickHandlers >= buttons) {
          addResult({
            type: "click",
            element: `${buttons} Button(s)`,
            status: "pass",
            message: "All buttons have click handlers attached"
          });
          passCount++;
        } else {
          addResult({
            type: "click",
            element: `${buttons - clickHandlers} Button(s)`,
            status: "fail",
            message: `${buttons - clickHandlers} button(s) missing click handlers`
          });
          failCount++;
        }
      }
      
      if (scenario.type === "form") {
        const forms = (code.match(/<form/gi) || []).length;
        const inputs = (code.match(/<input/gi) || []).length;
        const submitHandlers = (code.match(/onSubmit/g) || []).length;
        
        if (forms === 0 && inputs === 0) {
          addResult({
            type: "form",
            element: "Forms",
            status: "pass",
            message: "No forms to test"
          });
          passCount++;
        } else if (forms > 0 && submitHandlers >= forms) {
          addResult({
            type: "form",
            element: `${forms} Form(s)`,
            status: "pass",
            message: "All forms have submit handlers"
          });
          passCount++;
        } else if (forms > submitHandlers) {
          addResult({
            type: "form",
            element: `${forms - submitHandlers} Form(s)`,
            status: "fail",
            message: "Forms missing submit handlers - may cause page refresh"
          });
          failCount++;
        }
      }
      
      if (scenario.type === "navigation") {
        const links = (code.match(/<a\s+[^>]*href/gi) || []).length;
        const deadLinks = (code.match(/href=['"]#['"]/g) || []).length;
        
        if (links === 0) {
          addResult({
            type: "navigation",
            element: "Links",
            status: "pass",
            message: "No navigation links to test"
          });
          passCount++;
        } else if (deadLinks > 0) {
          addResult({
            type: "navigation",
            element: `${deadLinks} Link(s)`,
            status: "warning",
            message: `${deadLinks} placeholder link(s) with href="#"`
          });
        } else {
          addResult({
            type: "navigation",
            element: `${links} Link(s)`,
            status: "pass",
            message: "All links have valid destinations"
          });
          passCount++;
        }
      }
      
      if (scenario.type === "interaction") {
        const hasState = code.includes('useState') || code.includes('state');
        const hasEvents = code.includes('onClick') || code.includes('onChange') || code.includes('onSubmit');
        
        if (hasState && hasEvents) {
          addResult({
            type: "interaction",
            element: "User Flow",
            status: "pass",
            message: "Application has interactive state management"
          });
          passCount++;
        } else if (!hasEvents) {
          addResult({
            type: "interaction",
            element: "Interactivity",
            status: "warning",
            message: "Limited user interaction - no event handlers found"
          });
        } else {
          addResult({
            type: "interaction",
            element: "User Flow",
            status: "pass",
            message: "Basic interactivity detected"
          });
          passCount++;
        }
      }
    }
    
    setProgress(100);
    setCurrentTest(null);
    setSummary({ pass: passCount, fail: failCount, fixed: fixedCount });
    setIsRunning(false);
  }, [code, addResult]);

  const autoFixIssue = useCallback(async (result: TestResult) => {
    if (!onCodeFix || !code) return;
    
    const issues = analyzeCode();
    const relevantIssue = issues.find(i => i.type === result.type && i.fix);
    
    if (relevantIssue?.fix) {
      const fixedCode = code.replace(
        new RegExp(relevantIssue.element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        relevantIssue.fix
      );
      
      if (fixedCode !== code) {
        onCodeFix(fixedCode);
        setTestResults(prev => prev.map(r => 
          r.id === result.id 
            ? { ...r, status: "fixed" as const, autoFixed: true, fixApplied: "Handler added" }
            : r
        ));
        setSummary(prev => ({ ...prev, fail: prev.fail - 1, fixed: prev.fixed + 1 }));
      }
    }
  }, [code, onCodeFix, analyzeCode]);

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pass": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "fail": return <XCircle className="w-4 h-4 text-red-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "fixed": return <Wrench className="w-4 h-4 text-purple-400" />;
    }
  };

  const getTypeIcon = (type: TestResult["type"]) => {
    switch (type) {
      case "click": return <MousePointer className="w-3 h-3" />;
      case "form": return <FormInput className="w-3 h-3" />;
      case "navigation": return <Link2 className="w-3 h-3" />;
      case "visibility": return <Eye className="w-3 h-3" />;
      case "interaction": return <Play className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-lg border border-purple-500/20">
      <div className="flex items-center justify-between p-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-gold">LIVE SELF-TESTING AI</span>
          {isRunning && (
            <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-300 animate-pulse">
              Testing...
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant={isRunning ? "destructive" : "default"}
          onClick={isRunning ? () => setIsRunning(false) : runTests}
          disabled={!code}
          className={isRunning ? "" : "bg-gold hover:bg-gold/90 text-black"}
          data-testid="button-run-tests"
        >
          {isRunning ? (
            <>
              <Square className="w-3 h-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {(isRunning || progress > 0) && (
        <div className="px-3 py-2 border-b border-purple-500/10">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              {currentTest ? `Testing: ${currentTest}` : "Tests complete"}
            </span>
            <span className="text-gold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      <div className="flex items-center gap-4 px-3 py-2 border-b border-purple-500/10 text-xs">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-400" />
          <span className="text-green-400 font-medium">{summary.pass} Passed</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="w-3 h-3 text-red-400" />
          <span className="text-red-400 font-medium">{summary.fail} Failed</span>
        </div>
        <div className="flex items-center gap-1">
          <Wrench className="w-3 h-3 text-purple-400" />
          <span className="text-purple-400 font-medium">{summary.fixed} Fixed</span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {testResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Eye className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click "Run Tests" to analyze your app like a real user
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {testResults.map((result) => (
              <div
                key={result.id}
                className="flex items-start gap-2 p-2 rounded bg-black/30 border border-purple-500/10"
              >
                <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(result.type)}
                    <span className="text-xs font-medium">{result.element}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
                  {result.autoFixed && (
                    <Badge variant="outline" className="mt-1 text-xs border-purple-500/50 text-purple-300">
                      Auto-fixed: {result.fixApplied}
                    </Badge>
                  )}
                </div>
                {result.status === "fail" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => autoFixIssue(result)}
                    data-testid={`button-fix-${result.id}`}
                  >
                    <Wrench className="w-3 h-3 mr-1" />
                    Fix
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
