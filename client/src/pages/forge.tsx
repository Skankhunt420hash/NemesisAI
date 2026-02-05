import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceButton } from "@/components/VoiceButton";
import { SimulationFact } from "@/components/SimulationFact";
import { 
  Globe,
  Gamepad2,
  Glasses,
  Smartphone,
  Sparkles,
  Code,
  Wand2,
  Copy,
  Check,
  ArrowLeft,
  History,
  Loader2,
  Play,
  ExternalLink,
  Package,
  Send,
  AlertCircle,
  Crown
} from "lucide-react";
import { Link } from "wouter";
import type { GeneratedApp } from "@shared/schema";

type AppType = "web" | "3d-game" | "vr-world" | "native";

interface AppTypeOption {
  id: AppType;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Globe;
  techStack: string;
  language: string;
}

const appTypes: AppTypeOption[] = [
  {
    id: "web",
    title: "WEB APP",
    subtitle: "High-Performance Web Solutions",
    description: "Modern React applications with responsive design and real-time capabilities",
    icon: Globe,
    techStack: "React + TypeScript + Tailwind",
    language: "react",
  },
  {
    id: "3d-game",
    title: "3D GAME",
    subtitle: "Immersive Three.js Environments",
    description: "Interactive 3D games and visualizations with WebGL and Three.js",
    icon: Gamepad2,
    techStack: "Three.js + React Three Fiber",
    language: "threejs",
  },
  {
    id: "vr-world",
    title: "VR WORLD",
    subtitle: "A-Frame Virtual Reality",
    description: "WebXR virtual reality experiences accessible from any browser",
    icon: Glasses,
    techStack: "A-Frame + WebXR",
    language: "aframe",
  },
  {
    id: "native",
    title: "NATIVE APP",
    subtitle: "Mobile Store-Ready Packages",
    description: "Cross-platform mobile apps ready for iOS and Android stores",
    icon: Smartphone,
    techStack: "React Native + Expo",
    language: "react-native",
  },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ForgePage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<AppType | null>(null);
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("My App");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedTypeConfig = appTypes.find(t => t.id === selectedType);

  const { data: apps = [] } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleVoiceTranscript = (text: string) => {
    setPrompt(text);
    handleGenerate(text);
  };

  const canAccess = user?.isAdmin || user?.isPro;

  const handleGenerate = async (inputPrompt?: string) => {
    const finalPrompt = inputPrompt || prompt;
    if (!finalPrompt.trim() || !selectedTypeConfig) return;
    
    if (!canAccess) {
      setGenError("Pro subscription required. Upgrade to unlock unlimited app generation.");
      return;
    }

    setChatHistory(prev => [...prev, { 
      role: "user", 
      content: finalPrompt, 
      timestamp: new Date() 
    }]);

    setGenError("");
    setIsGenerating(true);

    const isIncremental = generatedCode && (
      finalPrompt.toLowerCase().includes("change") ||
      finalPrompt.toLowerCase().includes("update") ||
      finalPrompt.toLowerCase().includes("modify") ||
      finalPrompt.toLowerCase().includes("add") ||
      finalPrompt.toLowerCase().includes("remove") ||
      finalPrompt.toLowerCase().includes("fix")
    );

    let techContext = "";
    switch (selectedType) {
      case "3d-game":
        techContext = "Use Three.js with React Three Fiber for 3D rendering. Include OrbitControls and proper lighting.";
        break;
      case "vr-world":
        techContext = "Use A-Frame for WebVR. Create an immersive VR scene with interactive elements.";
        break;
      case "native":
        techContext = "Use React Native with Expo. Ensure cross-platform compatibility for iOS and Android.";
        break;
      default:
        techContext = "Use React with modern hooks and Tailwind CSS for styling.";
    }

    const contextPrompt = isIncremental
      ? `Tech Stack: ${selectedTypeConfig.techStack}\n${techContext}\n\nCurrent code:\n\`\`\`${selectedTypeConfig.language}\n${generatedCode}\n\`\`\`\n\nUser request: ${finalPrompt}\n\nPlease make ONLY the requested changes while preserving all other functionality.`
      : `Tech Stack: ${selectedTypeConfig.techStack}\n${techContext}\n\nUser request: ${finalPrompt}\n\nGenerate a complete, production-ready implementation.`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: contextPrompt,
          name: appName || "Untitled App",
          language: selectedTypeConfig.language,
          appType: selectedType,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let code = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                code += data.content;
                setGeneratedCode(code);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) throw e;
            }
          }
        }
      }

      setChatHistory(prev => [...prev, { 
        role: "assistant", 
        content: "Code generated successfully. Check the preview panel.", 
        timestamp: new Date() 
      }]);

      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      setPrompt("");
    } catch (err: any) {
      setGenError(err.message || "Failed to generate code");
      setChatHistory(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${err.message}`, 
        timestamp: new Date() 
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportNative = async () => {
    try {
      const res = await fetch("/api/export-native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: generatedCode,
          appName,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${appName.replace(/\s+/g, "-").toLowerCase()}-react-native.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const renderPreview = () => {
    if (!generatedCode) return null;
    
    const language = selectedTypeConfig?.language || "react";
    
    if (language === "react" || language === "javascript" || language === "html" || language === "threejs" || language === "aframe") {
      let htmlContent = "";
      
      if (language === "aframe") {
        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
</head>
<body>
  ${generatedCode}
</body>
</html>`;
      } else if (language === "threejs") {
        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/three@0.157.0/build/three.min.js"></script>
  <script src="https://unpkg.com/three@0.157.0/examples/js/controls/OrbitControls.js"></script>
  <style>
    body { margin: 0; overflow: hidden; background: #0a0a0a; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>
    ${generatedCode}
  </script>
</body>
</html>`;
      } else {
        htmlContent = language === "html" 
          ? generatedCode 
          : `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0a0a0a; color: #fff; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${generatedCode}
    
    if (typeof App !== 'undefined') {
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    }
  </script>
</body>
</html>`;
      }
      
      return (
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-0 rounded-md bg-black"
          sandbox="allow-scripts"
          title="App Preview"
        />
      );
    }
    
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Live preview not available for this type</p>
          <p className="text-sm mt-2">Export as package to test on device</p>
        </div>
      </div>
    );
  };

  if (!selectedType) {
    return (
      <div className="min-h-screen obsidian-bg flex flex-col pb-20 md:pb-0">
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gold-gradient mb-6 neon-purple-glow">
              <Sparkles className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
              The Forge
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Select your creation type to begin building with AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-4xl px-4">
            {appTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="forge-card p-6 md:p-8 text-left group cursor-pointer"
                data-testid={`card-${type.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-700/20 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-violet-700/30 transition-colors neon-purple-border">
                    <type.icon className="w-7 h-7 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-primary mb-1">{type.title}</h3>
                    <p className="text-sm text-violet-300 mb-2">{type.subtitle}</p>
                    <p className="text-xs text-muted-foreground mb-3">{type.description}</p>
                    <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                      {type.techStack}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!canAccess && (
            <div className="mt-8 text-center">
              <Link href="/pricing">
                <Button variant="outline" className="gap-2 neon-purple-border" data-testid="button-upgrade">
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro for Full Access
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen obsidian-bg flex flex-col pb-20 md:pb-0">
      <nav className="sticky top-0 z-50 border-b border-violet-500/20 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedType(null)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                {selectedTypeConfig && <selectedTypeConfig.icon className="w-5 h-5 text-black" />}
              </div>
              <span className="text-lg font-semibold tracking-tight hidden md:block">
                {selectedTypeConfig?.title}
              </span>
              <Badge variant="outline" className="border-violet-500/50 text-violet-400 text-xs">
                {selectedTypeConfig?.techStack}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {user?.isAdmin && (
                <Badge variant="outline" className="border-primary text-primary">
                  <Crown className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
              {user?.isPro && !user?.isAdmin && (
                <Badge variant="outline" className="border-primary text-primary">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-[400px] md:min-w-[350px] border-b md:border-b-0 md:border-r border-violet-500/20 flex flex-col bg-card/30 max-h-[50vh] md:max-h-none">
          <div className="p-4 border-b border-violet-500/20 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="appName" className="text-xs">App Name</Label>
                <Input
                  id="appName"
                  placeholder="My App"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="h-9 border-violet-500/20"
                  data-testid="input-app-name"
                />
              </div>
              <div className="flex items-end">
                <Badge variant="secondary" className="w-full justify-center py-2">
                  {selectedTypeConfig?.language}
                </Badge>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Describe your {selectedTypeConfig?.title.toLowerCase()}</p>
                  <p className="text-xs mt-2">Use voice or text commands</p>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-violet-500/10 border border-violet-500/20 ml-4"
                      : "bg-muted/50 border border-border mr-4"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
              
              <SimulationFact isActive={isGenerating} />
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {genError && (
            <div className="p-3 mx-4 mb-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{genError}</span>
            </div>
          )}

          <div className="p-4 border-t border-violet-500/20">
            <div className="flex gap-2">
              <Textarea
                placeholder={`Describe your ${selectedTypeConfig?.title.toLowerCase()}...`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[60px] md:min-h-[80px] resize-none flex-1 border-violet-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                data-testid="textarea-prompt"
              />
              <div className="flex flex-col gap-2">
                <VoiceButton
                  onTranscript={handleVoiceTranscript}
                  disabled={isGenerating}
                />
                <Button
                  size="icon"
                  onClick={() => handleGenerate()}
                  disabled={!prompt.trim() || isGenerating}
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-violet-500/20 bg-card/30">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono text-xs">
                {appName || "Untitled"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {generatedCode && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  {selectedType === "native" && (
                    <Button variant="outline" size="sm" onClick={handleExportNative} data-testid="button-export-native">
                      <Package className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  )}
                  <Button variant="outline" size="sm" data-testid="button-publish">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2 w-fit">
                <TabsTrigger value="preview" className="gap-2">
                  <Play className="w-4 h-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="w-4 h-4" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="flex-1 m-4 mt-2 rounded-lg border border-violet-500/20 overflow-hidden bg-black/50">
                {generatedCode ? (
                  renderPreview()
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">Ready to Create</h3>
                      <p className="text-sm">Describe your {selectedTypeConfig?.title.toLowerCase()}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="code" className="flex-1 m-4 mt-2 overflow-hidden">
                <ScrollArea className="h-full rounded-lg border border-violet-500/20 bg-black/50 p-4">
                  {generatedCode ? (
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                      <code data-testid="text-generated-code">{generatedCode}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>Generated code will appear here</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="flex-1 m-4 mt-2 overflow-hidden">
                <ScrollArea className="h-full">
                  {apps.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>No previous apps</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 p-1">
                      {apps.filter(app => app.appType === selectedType || (!app.appType && selectedType === "web")).map((app) => (
                        <div
                          key={app.id}
                          className="cursor-pointer forge-card p-4"
                          onClick={() => setGeneratedCode(app.generatedCode)}
                          data-testid={`card-app-${app.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-sm font-medium truncate">{app.name}</span>
                            <Badge variant="secondary" className="text-xs">{app.language}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {app.prompt}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
