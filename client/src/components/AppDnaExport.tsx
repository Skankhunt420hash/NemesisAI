import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dna, Download, Upload, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppDNA {
  version: string;
  createdAt: string;
  architecture: {
    pattern: string;
    components: string[];
    stateManagement: string;
    styling: string;
  };
  designDecisions: {
    colorScheme: string;
    typography: string;
    spacing: string;
    animations: string;
  };
  buildStrategies: {
    bundler: string;
    optimization: string[];
    deployment: string;
  };
  agentMemory: {
    preferences: string[];
    patterns: string[];
    avoidances: string[];
  };
}

interface AppDnaExportProps {
  code: string;
  appType: string;
  projectName: string;
}

export function AppDnaExport({ code, appType, projectName }: AppDnaExportProps) {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [dna, setDna] = useState<AppDNA | null>(null);
  const [copied, setCopied] = useState(false);

  const extractDNA = async () => {
    if (!code) {
      toast({ title: "No Code", description: "Generate an app first", variant: "destructive" });
      return;
    }

    setIsExtracting(true);

    await new Promise(r => setTimeout(r, 1500));

    const components = (code.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*\(/g) || [])
      .map(m => m.replace(/function\s+|const\s+|\s*=\s*\(/g, "").trim())
      .filter(c => c.length > 0);

    const hasUseState = code.includes("useState");
    const hasContext = code.includes("Context");
    const hasTailwind = code.includes("className=");
    const hasAnimations = code.includes("animate-") || code.includes("transition");

    const extractedDNA: AppDNA = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      architecture: {
        pattern: appType === "web" ? "React SPA" : 
                 appType === "3d" ? "Three.js Scene Graph" :
                 appType === "vr" ? "A-Frame Entity-Component" : "React Native Expo",
        components: components.slice(0, 10),
        stateManagement: hasContext ? "React Context" : hasUseState ? "Local State" : "None",
        styling: hasTailwind ? "Tailwind CSS" : "CSS-in-JS"
      },
      designDecisions: {
        colorScheme: code.includes("dark") ? "Dark Mode Primary" : "Light Mode Primary",
        typography: "System Fonts",
        spacing: code.includes("gap-") ? "Consistent Gap System" : "Mixed Spacing",
        animations: hasAnimations ? "Micro-interactions Enabled" : "Minimal Animations"
      },
      buildStrategies: {
        bundler: "Vite",
        optimization: [
          "Tree Shaking",
          "Code Splitting",
          hasTailwind ? "CSS Purging" : "Minification"
        ],
        deployment: appType === "native" ? "Expo EAS" : "Static Hosting"
      },
      agentMemory: {
        preferences: [
          `${appType} development`,
          hasTailwind ? "Tailwind styling" : "Custom CSS",
          hasUseState ? "Hooks-based state" : "Minimal state"
        ],
        patterns: [
          "Component composition",
          "Props-driven design",
          components.length > 5 ? "Modular architecture" : "Monolithic structure"
        ],
        avoidances: [
          code.includes("class ") ? "" : "Class components",
          code.includes("var ") ? "" : "var declarations",
          "Inline styles"
        ].filter(a => a.length > 0)
      }
    };

    setDna(extractedDNA);
    setIsExtracting(false);

    toast({
      title: "DNA Extracted",
      description: "App genetics captured successfully"
    });
  };

  const handleExport = () => {
    if (!dna) return;

    const blob = new Blob([JSON.stringify(dna, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName || "app"}_dna.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "DNA Exported",
      description: "Use this file to clone your app's genetics"
    });
  };

  const handleCopy = async () => {
    if (!dna) return;

    await navigator.clipboard.writeText(JSON.stringify(dna, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Copied to Clipboard",
      description: "Paste into a new project to apply DNA"
    });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedDNA = JSON.parse(text) as AppDNA;
        
        if (!importedDNA.version || !importedDNA.architecture) {
          throw new Error("Invalid DNA format");
        }

        setDna(importedDNA);
        toast({
          title: "DNA Imported",
          description: `Loaded ${importedDNA.architecture.pattern} genetics from ${new Date(importedDNA.createdAt).toLocaleDateString()}`
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid DNA file format",
          variant: "destructive"
        });
      }
    };
    input.click();
  };

  return (
    <Card className="bg-black/40 border-violet-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Dna className="w-4 h-4 text-violet-400" />
          App DNA Export
          <Badge variant="outline" className="ml-auto text-xs border-emerald-500/30 text-emerald-400">
            IP-Level
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Export your app's architecture, design decisions, and build strategies to apply to new projects.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={extractDNA}
            disabled={isExtracting || !code}
            variant="outline"
            className="border-violet-500/30"
            data-testid="button-extract-dna"
          >
            {isExtracting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Dna className="w-4 h-4 mr-2" />
            )}
            Extract DNA
          </Button>
          <Button
            onClick={handleImport}
            variant="outline"
            className="border-violet-500/30"
            data-testid="button-import-dna"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import DNA
          </Button>
        </div>

        {dna && (
          <>
            <div className="p-3 rounded-lg bg-black/30 border border-violet-500/20 space-y-3" data-testid="dna-summary">
              <div>
                <p className="text-xs font-medium text-violet-400">Architecture</p>
                <p className="text-xs text-muted-foreground" data-testid="text-dna-pattern">{dna.architecture.pattern}</p>
                <p className="text-xs text-muted-foreground" data-testid="text-dna-components">{dna.architecture.components.length} components, {dna.architecture.stateManagement}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-violet-400">Design</p>
                <p className="text-xs text-muted-foreground">{dna.designDecisions.colorScheme}, {dna.designDecisions.animations}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-violet-400">Build</p>
                <p className="text-xs text-muted-foreground">{dna.buildStrategies.bundler} + {dna.buildStrategies.optimization.join(", ")}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-violet-400">Agent Memory</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dna.agentMemory.preferences.slice(0, 3).map((pref, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{pref}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600"
                data-testid="button-download-dna"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="border-violet-500/30"
                data-testid="button-copy-dna"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center">
          "Build me another app with the same DNA"
        </p>
      </CardContent>
    </Card>
  );
}
