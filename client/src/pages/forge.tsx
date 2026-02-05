import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Crown,
  CheckCircle2,
  Link as LinkIcon,
  Lock,
  Users
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import type { GeneratedApp, ProjectMessage } from "@shared/schema";

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

interface ProjectWithMessages extends GeneratedApp {
  messages?: ProjectMessage[];
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
  const [currentProject, setCurrentProject] = useState<ProjectWithMessages | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedTypeConfig = appTypes.find(t => t.id === selectedType);

  const { data: apps = [] } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const canAccess = user?.isAdmin || user?.isPro;

  // Create a new project session
  const createProject = async (type: AppType, name: string) => {
    const typeConfig = appTypes.find(t => t.id === type);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        appType: type,
        language: typeConfig?.language || "react",
      }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to create project");
    return res.json();
  };

  // Load an existing project
  const loadProject = async (projectId: number) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load project");
    const project: ProjectWithMessages = await res.json();
    setCurrentProject(project);
    setGeneratedCode(project.generatedCode);
    setAppName(project.name);
    
    // Restore chat history from messages
    if (project.messages) {
      const history: ChatMessage[] = project.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));
      setChatHistory(history);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setPrompt(text);
    handleIterate(text);
  };

  const handleIterate = async (inputPrompt?: string) => {
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

    try {
      // If no current project, create one first
      let projectId = currentProject?.id;
      if (!projectId) {
        const newProject = await createProject(selectedType!, appName);
        setCurrentProject(newProject);
        projectId = newProject.id;
      }

      // Iterate on the project
      const res = await fetch(`/api/projects/${projectId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Iteration failed");
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
        content: "Code updated successfully. Check the preview panel.", 
        timestamp: new Date() 
      }]);

      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      setPrompt("");
    } catch (err: any) {
      setGenError(err.message || "Failed to iterate");
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

  const handleFinalize = async (makePublic: boolean) => {
    if (!currentProject) return;
    
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: makePublic }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to finalize");
      const updated = await res.json();
      setCurrentProject(updated);
      setShowFinishDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
    } catch (err: any) {
      setGenError(err.message);
    }
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

  const getLiveLink = () => {
    if (!currentProject?.id) return null;
    return `${window.location.origin}/launch/${currentProject.id}`;
  };

  const copyLiveLink = () => {
    const link = getLiveLink();
    if (link) {
      navigator.clipboard.writeText(link);
    }
  };

  const handleSelectType = (type: AppType) => {
    setSelectedType(type);
    setCurrentProject(null);
    setGeneratedCode("");
    setChatHistory([]);
    setGenError("");
  };

  const handleLoadFromHistory = async (app: GeneratedApp) => {
    setSelectedType(app.appType as AppType || "web");
    await loadProject(app.id);
  };

  const renderPreview = () => {
    if (!generatedCode) return null;
    
    const language = selectedTypeConfig?.language || currentProject?.language || "react";
    
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
  <script src="https://cdn.tailwindcss.com"></script>
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
                onClick={() => handleSelectType(type.id)}
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

          {apps.length > 0 && (
            <div className="w-full max-w-4xl px-4 mt-12">
              <h2 className="text-lg font-semibold mb-4 text-center text-violet-300">Continue Working</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {apps.slice(0, 4).map(app => (
                  <button
                    key={app.id}
                    onClick={() => handleLoadFromHistory(app)}
                    className="forge-card p-4 text-left"
                    data-testid={`card-continue-${app.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium truncate">{app.name}</span>
                      <Badge variant="secondary" className="text-xs">{app.appType || "web"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{app.prompt || "No description"}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                onClick={() => {
                  setSelectedType(null);
                  setCurrentProject(null);
                  setGeneratedCode("");
                  setChatHistory([]);
                }}
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

            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile view toggle */}
              <div className="flex md:hidden border rounded-md border-violet-500/30">
                <Button
                  variant={mobileView === "chat" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMobileView("chat")}
                  className="text-xs"
                >
                  Chat
                </Button>
                <Button
                  variant={mobileView === "preview" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMobileView("preview")}
                  className="text-xs"
                >
                  Preview
                </Button>
              </div>

              {user?.isAdmin && (
                <Badge variant="outline" className="border-primary text-primary hidden md:flex">
                  <Crown className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
              {user?.isPro && !user?.isAdmin && (
                <Badge variant="outline" className="border-primary text-primary hidden md:flex">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Chat Panel - hidden on mobile when preview is active */}
        <div className={`${mobileView === "preview" ? "hidden md:flex" : "flex"} w-full md:w-[400px] md:min-w-[350px] border-b md:border-b-0 md:border-r border-violet-500/20 flex-col bg-card/30 max-h-[50vh] md:max-h-none`}>
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

            {/* Live Link Display */}
            {currentProject?.id && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-violet-500/10 border border-violet-500/20">
                <LinkIcon className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-xs text-violet-300 truncate flex-1">
                  /launch/{currentProject.id}
                </span>
                <Button variant="ghost" size="sm" onClick={copyLiveLink} className="h-6 px-2" data-testid="button-copy-link">
                  <Copy className="w-3 h-3" />
                </Button>
                <a
                  href={getLiveLink() || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300"
                  data-testid="link-launch"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Describe your {selectedTypeConfig?.title.toLowerCase()}</p>
                  <p className="text-xs mt-2">Use voice or text commands</p>
                  <p className="text-xs mt-4 text-violet-400">
                    Chat endlessly - each message builds on the last
                  </p>
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
                    handleIterate();
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
                  onClick={() => handleIterate()}
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

        {/* Preview Panel - hidden on mobile when chat is active */}
        <div className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} flex-1 flex-col overflow-hidden`}>
          <div className="flex items-center justify-between p-3 border-b border-violet-500/20 bg-card/30">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono text-xs">
                {appName || "Untitled"}
              </Badge>
              {currentProject?.isFinalized && (
                currentProject.isPublished ? (
                  <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Published
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-violet-500/50 text-violet-400 text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )
              )}
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
                  {!currentProject?.isFinalized && (
                    <Button
                      size="sm"
                      onClick={() => setShowFinishDialog(true)}
                      className="gold-gradient text-black hover:opacity-90"
                      data-testid="button-finish"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      FINISH
                    </Button>
                  )}
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
                          onClick={() => handleLoadFromHistory(app)}
                          data-testid={`card-app-${app.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-sm font-medium truncate">{app.name}</span>
                            <div className="flex items-center gap-1">
                              {app.isFinalized && (
                                <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">{app.language}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {app.prompt || "No description"}
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

      {/* Finish Dialog - Choose Private or Published */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="sm:max-w-md bg-black/95 border-violet-500/30">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">Finish Your App</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              How would you like to save your creation?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => handleFinalize(false)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
              data-testid="button-finish-private"
            >
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-violet-400" />
              </div>
              <span className="font-semibold text-white">Private</span>
              <span className="text-xs text-muted-foreground text-center">
                Only you can access
              </span>
            </button>
            <button
              onClick={() => handleFinalize(true)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors"
              data-testid="button-finish-publish"
            >
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center">
                <Users className="w-6 h-6 text-black" />
              </div>
              <span className="font-semibold text-primary">Published</span>
              <span className="text-xs text-muted-foreground text-center">
                Share in the Library
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
