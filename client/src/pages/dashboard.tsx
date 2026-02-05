import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceButton } from "@/components/VoiceButton";
import { SimulationFact } from "@/components/SimulationFact";
import { 
  Sparkles, 
  LogOut, 
  Code, 
  Wand2, 
  Copy, 
  Check, 
  Download, 
  Crown, 
  History,
  Loader2,
  Play,
  ExternalLink,
  Package,
  MessageSquare,
  Send,
  AlertCircle,
  Maximize2,
  Minimize2
} from "lucide-react";
import { useLocation, Link } from "wouter";
import type { GeneratedApp } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("My App");
  const [language, setLanguage] = useState("react");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleGenerate = async (inputPrompt?: string) => {
    const finalPrompt = inputPrompt || prompt;
    if (!finalPrompt.trim()) return;
    
    if (!user?.isPro) {
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

    const contextPrompt = isIncremental
      ? `Current code:\n\`\`\`${language}\n${generatedCode}\n\`\`\`\n\nUser request: ${finalPrompt}\n\nPlease make ONLY the requested changes while preserving all other functionality.`
      : finalPrompt;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: contextPrompt,
          name: appName || "Untitled App",
          language,
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

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleExportNative = () => {
    const blob = new Blob([generatedCode], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appName.replace(/\s+/g, "-").toLowerCase()}-react-native.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPreview = () => {
    if (!generatedCode) return null;
    
    if (language === "react" || language === "javascript" || language === "html") {
      const htmlContent = language === "html" 
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
          <p>Live preview available for React, JavaScript, and HTML</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 border-b gold-line bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <span className="text-lg font-semibold tracking-tight">NemesisAI</span>
              <Badge variant="outline" className="border-violet-500/50 text-violet-400 text-xs">
                Ultimate Creator
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {user?.isPro ? (
                <Badge variant="outline" className="border-primary text-primary">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              ) : (
                <Link href="/pricing">
                  <Button variant="outline" size="sm" data-testid="button-upgrade">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </Link>
              )}

              {user?.isAdmin && (
                <Button variant="outline" size="sm" data-testid="button-export">
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[400px] min-w-[350px] border-r gold-line flex flex-col bg-card/50">
          <div className="p-4 border-b gold-line space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Voice & Chat Control</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="appName" className="text-xs">App Name</Label>
                <Input
                  id="appName"
                  placeholder="My App"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="h-9"
                  data-testid="input-app-name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="language" className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language" className="h-9" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="react">React</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="html">HTML/CSS</SelectItem>
                    <SelectItem value="react-native">React Native</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Describe your app or use voice commands</p>
                  <p className="text-xs mt-2">Say "Create a todo app" or type your request</p>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary/10 border border-primary/20 ml-4"
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

          <div className="p-4 border-t gold-line">
            <div className="flex gap-2">
              <Textarea
                placeholder="Describe what you want to build or modify..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none flex-1"
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
          <div className="flex items-center justify-between p-3 border-b gold-line bg-card/30">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono text-xs">
                {appName || "Untitled"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {language}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {generatedCode && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  {language === "react-native" && (
                    <Button variant="outline" size="sm" onClick={handleExportNative} data-testid="button-export-native">
                      <Package className="w-4 h-4 mr-2" />
                      Export Package
                    </Button>
                  )}
                  <Button variant="outline" size="sm" data-testid="button-publish">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2 w-fit">
                <TabsTrigger value="preview" className="gap-2">
                  <Play className="w-4 h-4" />
                  Live Preview
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

              <TabsContent value="preview" className="flex-1 m-4 mt-2 rounded-lg border gold-line overflow-hidden bg-black/50">
                {generatedCode ? (
                  renderPreview()
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">Ready to Create</h3>
                      <p className="text-sm">Use voice or text to describe your app</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="code" className="flex-1 m-4 mt-2 overflow-hidden">
                <ScrollArea className="h-full rounded-lg border gold-line bg-black/50 p-4">
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
                      {apps.map((app) => (
                        <Card
                          key={app.id}
                          className="cursor-pointer hover-elevate border gold-line"
                          onClick={() => setGeneratedCode(app.generatedCode)}
                          data-testid={`card-app-${app.id}`}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-sm truncate">{app.name}</CardTitle>
                              <Badge variant="secondary" className="text-xs">{app.language}</Badge>
                            </div>
                            <CardDescription className="text-xs line-clamp-2">
                              {app.prompt}
                            </CardDescription>
                          </CardHeader>
                        </Card>
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
