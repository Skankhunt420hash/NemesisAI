import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Layers, Database, GitBranch, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExplanationSection {
  title: string;
  icon: typeof Layers;
  content: string[];
  risks?: string[];
}

interface ExplainMyAppProps {
  code: string;
  appType: string;
  projectName: string;
}

export function ExplainMyApp({ code, appType, projectName }: ExplainMyAppProps) {
  const { toast } = useToast();
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanations, setExplanations] = useState<ExplanationSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const analyzeAndExplain = async () => {
    if (!code) {
      toast({ title: "No Code", description: "Generate an app first", variant: "destructive" });
      return;
    }

    setIsExplaining(true);
    setExplanations([]);

    await new Promise(r => setTimeout(r, 1500));

    const sections: ExplanationSection[] = [];

    const componentCount = (code.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
    const hasState = code.includes("useState") || code.includes("state");
    const hasEffects = code.includes("useEffect");
    const hasAPI = code.includes("fetch") || code.includes("axios") || code.includes("/api/");

    sections.push({
      title: "Architecture Overview",
      icon: Layers,
      content: [
        `This is a ${appType.toUpperCase()} application${projectName ? ` called "${projectName}"` : ""}.`,
        `Contains approximately ${componentCount} components/functions.`,
        hasState ? "Uses React state management for dynamic data." : "Minimal state management - mostly static content.",
        hasEffects ? "Has side effects (data fetching, subscriptions, timers)." : "No side effects detected.",
        appType === "web" ? "Renders as a standard web application." :
        appType === "3d" ? "Uses Three.js for 3D rendering with WebGL." :
        appType === "vr" ? "Implements WebXR for virtual reality experiences." :
        "Designed for native mobile deployment via Expo."
      ]
    });

    sections.push({
      title: "Data Flow",
      icon: Database,
      content: [
        hasAPI ? "Fetches data from API endpoints." : "No external data sources detected.",
        hasState ? "State flows down through component props." : "Uses static data only.",
        code.includes("context") || code.includes("Context") ? "Uses React Context for global state." : "No global state management.",
        code.includes("localStorage") ? "Persists data to localStorage." : "No local persistence.",
        code.includes("form") || code.includes("Form") ? "Handles form inputs and submissions." : "No form handling detected."
      ],
      risks: hasAPI ? ["API failures could break the app. Add error handling."] : undefined
    });

    const dependencies: string[] = [];
    if (code.includes("react")) dependencies.push("React");
    if (code.includes("three") || code.includes("Three")) dependencies.push("Three.js");
    if (code.includes("aframe") || code.includes("a-")) dependencies.push("A-Frame");
    if (code.includes("tailwind") || code.includes("className=")) dependencies.push("Tailwind CSS");
    if (code.includes("lucide") || code.includes("Icon")) dependencies.push("Lucide Icons");

    sections.push({
      title: "Dependencies",
      icon: GitBranch,
      content: [
        `Core dependencies: ${dependencies.join(", ") || "None detected"}`,
        appType === "web" ? "Standard React DOM rendering." :
        appType === "3d" ? "Requires WebGL-capable browser." :
        appType === "vr" ? "Requires WebXR-compatible device/browser." :
        "Requires Expo Go app or native build.",
        "All dependencies are production-ready."
      ]
    });

    const risks: string[] = [];
    if (code.includes("innerHTML")) risks.push("innerHTML usage - potential XSS vulnerability");
    if (code.includes("eval(")) risks.push("eval() detected - security risk");
    if (!code.includes("try") && hasAPI) risks.push("No error handling for API calls");
    if (code.length > 10000) risks.push("Large codebase - consider code splitting");

    sections.push({
      title: "Impact Analysis",
      icon: AlertTriangle,
      content: [
        "Changing the main component will affect the entire app.",
        hasState ? "State changes will trigger re-renders." : "Static content is safe to modify.",
        hasAPI ? "API endpoint changes require backend coordination." : "No external dependencies to coordinate.",
        `Estimated complexity: ${componentCount > 5 ? "HIGH" : componentCount > 2 ? "MEDIUM" : "LOW"}`
      ],
      risks: risks.length > 0 ? risks : undefined
    });

    setExplanations(sections);
    setIsExplaining(false);

    toast({
      title: "Explanation Ready",
      description: `${sections.length} sections analyzed`
    });
  };

  return (
    <Card className="bg-black/40 border-violet-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400" />
          Explain My App
          <Badge variant="outline" className="ml-auto text-xs border-amber-500/30 text-amber-400">
            ADHS-Friendly
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={analyzeAndExplain}
          disabled={isExplaining || !code}
          className="w-full"
          data-testid="button-explain-app"
        >
          {isExplaining ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Architecture...
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4 mr-2" />
              Explain My Own App
            </>
          )}
        </Button>

        {explanations.length > 0 && (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {explanations.map((section) => (
                <div 
                  key={section.title}
                  className="rounded-md border border-violet-500/20 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSection(
                      expandedSection === section.title ? null : section.title
                    )}
                    className="w-full flex items-center gap-2 p-3 bg-black/30 hover:bg-black/40 transition-colors"
                    data-testid={`button-expand-${section.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <section.icon className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium flex-1 text-left">{section.title}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      expandedSection === section.title ? "rotate-90" : ""
                    }`} />
                  </button>
                  
                  {expandedSection === section.title && (
                    <div className="p-3 space-y-2 bg-black/20" data-testid={`content-${section.title.toLowerCase().replace(" ", "-")}`}>
                      {section.content.map((line, i) => (
                        <p key={i} className="text-xs text-muted-foreground" data-testid={`text-line-${i}`}>
                          • {line}
                        </p>
                      ))}
                      {section.risks && section.risks.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-violet-500/20">
                          <p className="text-xs text-amber-400 font-medium mb-1">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Potential Risks:
                          </p>
                          {section.risks.map((risk, i) => (
                            <p key={i} className="text-xs text-amber-300/80">• {risk}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Perfect for handoffs, reviews, or when you forgot what you built
        </p>
      </CardContent>
    </Card>
  );
}
