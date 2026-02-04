import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  FileCode,
  AlertCircle
} from "lucide-react";
import { useLocation, Link } from "wouter";
import type { GeneratedApp } from "@shared/schema";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const { data: apps = [], isLoading: appsLoading } = useQuery<GeneratedApp[]>({
    queryKey: ["/api/apps"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; name: string; language: string }) => {
      const res = await apiRequest("POST", "/api/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    if (!user?.isPro) {
      setGenError("Pro subscription required to generate apps. Please upgrade your account.");
      return;
    }

    setGenError("");
    setIsGenerating(true);
    setGeneratedCode("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
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

      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
    } catch (err: any) {
      setGenError(err.message || "Failed to generate code");
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

  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nemesis-export.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b gold-line bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <span className="text-lg font-semibold tracking-tight">NemesisAI</span>
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
                <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
                  <Download className="w-4 h-4 mr-2" />
                  Export
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border gold-line violet-glow-subtle">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Generate App
                </CardTitle>
                <CardDescription>
                  Describe the app you want to create and our AI will generate the code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName">App Name</Label>
                    <Input
                      id="appName"
                      placeholder="My Awesome App"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      data-testid="input-app-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language" data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="react">React</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe Your App</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Create a todo list app with the ability to add, remove, and mark tasks as complete..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                    data-testid="textarea-prompt"
                  />
                </div>

                {genError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2" data-testid="text-error">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {genError}
                  </div>
                )}

                <Button 
                  onClick={handleGenerate} 
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full sm:w-auto"
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border gold-line">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-primary" />
                    Code Preview
                  </CardTitle>
                  <CardDescription>
                    Generated code will appear here
                  </CardDescription>
                </div>
                {generatedCode && (
                  <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border gold-line bg-black/50 p-4">
                  {generatedCode ? (
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                      <code data-testid="text-generated-code">{generatedCode}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Enter a prompt and click Generate to see code here</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border gold-line">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="w-5 h-5 text-primary" />
                  Recent Apps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : apps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No apps generated yet. Create your first one!
                  </p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {apps.map((app, index) => (
                        <div key={app.id}>
                          {index > 0 && <Separator className="my-3" />}
                          <button
                            onClick={() => setGeneratedCode(app.generatedCode)}
                            className="w-full text-left p-3 rounded-md hover-elevate bg-card border gold-line"
                            data-testid={`button-app-${app.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium truncate">{app.name}</span>
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {app.language}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {app.prompt}
                            </p>
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {!user?.isPro && (
              <Card className="border gold-line violet-glow-subtle">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Crown className="w-10 h-10 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-2">Upgrade to Pro</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock unlimited app generation with a Pro subscription.
                    </p>
                    <Link href="/pricing">
                      <Button className="w-full" data-testid="button-upgrade-pro">
                        View Plans
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
