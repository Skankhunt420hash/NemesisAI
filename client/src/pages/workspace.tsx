import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import nemesisAgentAvatar from "@/assets/nemesis-agent.svg";
import Editor from "@monaco-editor/react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import {
  Send,
  Play,
  FileCode,
  FolderTree,
  Terminal,
  Eye,
  Bot,
  Loader2,
  ChevronRight,
  ChevronDown,
  File,
  FilePlus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  Minus,
  X,
  MessageSquare,
  Bug,
  Download,
  PanelLeftOpen,
} from "lucide-react";
import type { GeneratedApp, ProjectMessage, ProjectFiles, AgentStep } from "@shared/schema";

interface AgentEvent {
  type: "step" | "stream" | "result" | "error" | "done" | "meta";
  step?: AgentStep;
  content?: string;
  mode?: "standard" | "turbo";
  model?: string;
  turbo?: boolean;
  result?: {
    plan: string[];
    files: ProjectFiles;
    entryFile: string;
    diffs: Record<string, string>;
    summary: string;
    mode?: "standard" | "turbo";
    model?: string;
  };
  error?: string;
  projectId?: number;
}

function getLanguageFromPath(filepath: string): string {
  const ext = filepath.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
    html: "html", css: "css", json: "json", md: "markdown",
    py: "python", rs: "rust", go: "go", java: "java",
    scss: "scss", less: "less", yaml: "yaml", yml: "yaml",
    xml: "xml", svg: "xml", sh: "shell", bash: "shell",
  };
  return map[ext] || "plaintext";
}

function FileTreeNode({
  name,
  path,
  isSelected,
  onSelect,
  onDelete,
  depth = 0,
}: {
  name: string;
  path: string;
  isSelected: boolean;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  depth?: number;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer text-xs group ${
        isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover-elevate"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelect(path)}
      data-testid={`file-tree-item-${name}`}
    >
      <FileCode className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate flex-1">{name}</span>
      <button
        className="invisible group-hover:visible p-0.5 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(path); }}
        data-testid={`button-delete-file-${name}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function StepIndicator({ step }: { step: AgentStep }) {
  const icons: Record<string, typeof CheckCircle2> = {
    plan: Sparkles,
    edit: FileCode,
    create: FilePlus,
    delete: Trash2,
    command: Terminal,
    preview: Eye,
  };
  const Icon = icons[step.type] || Sparkles;
  const statusLabel = step.status === "running" ? "running" : step.status === "done" ? "done" : step.status === "error" ? "error" : "pending";

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-black/20 px-2.5 py-1.5 text-xs">
      {step.status === "running" ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
      ) : step.status === "done" ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      ) : step.status === "error" ? (
        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      )}
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className={`flex-1 ${step.status === "running" ? "text-primary" : "text-muted-foreground"}`}>
        {step.description}
      </span>
      <Badge
        variant="outline"
        className={`text-[10px] uppercase tracking-wide ${
          step.status === "done"
            ? "border-emerald-500/30 text-emerald-300"
            : step.status === "running"
              ? "border-primary/40 text-primary"
              : step.status === "error"
                ? "border-destructive/40 text-destructive"
                : "border-border/60 text-muted-foreground"
        }`}
      >
        {statusLabel}
      </Badge>
    </div>
  );
}

export default function WorkspacePage() {
  const { user } = useAuth();
  const [, workspaceParams] = useRoute("/workspace/:id");
  const [, studioParams] = useRoute("/studio/:id");
  const params = workspaceParams || studioParams;
  const projectId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const [files, setFiles] = useState<ProjectFiles>({});
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [entryFile, setEntryFile] = useState<string>("index.html");
  const [prompt, setPrompt] = useState("");
  const [agentMode, setAgentMode] = useState<"standard" | "turbo">("turbo");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [bottomTab, setBottomTab] = useState("agent");
  const [filesOpen, setFilesOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quickPrompts = [
    "Baue ein modernes Dashboard mit Login, Analytics und Dark Mode.",
    "Refaktoriere den Code für bessere Performance und klare Struktur.",
    "Füge Stripe-Checkout mit sauberem Error-Handling hinzu.",
    "Erstelle responsive Landingpage + Kontaktformular mit Validierung.",
  ];

  const applyQuickPrompt = useCallback((template: string) => {
    setPrompt(template);
    textareaRef.current?.focus();
  }, []);

  const { data: project, isLoading: projectLoading } = useQuery<GeneratedApp>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: messagesData } = useQuery<ProjectMessage[]>({
    queryKey: ["/api/projects", projectId, "messages"],
    enabled: !!projectId,
  });

  const { data: filesData } = useQuery<{ files: ProjectFiles; entryFile: string }>({
    queryKey: ["/api/projects", projectId, "files"],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (filesData) {
      setFiles(filesData.files);
      setEntryFile(filesData.entryFile);
      const fileKeys = Object.keys(filesData.files);
      if (fileKeys.length > 0 && !selectedFile) {
        setSelectedFile(filesData.entryFile || fileKeys[0]);
      }
    }
  }, [filesData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData, agentSteps]);

  const saveFileMutation = useMutation({
    mutationFn: async ({ filepath, content }: { filepath: string; content: string }) => {
      await apiRequest("PATCH", `/api/projects/${projectId}/file`, { filepath, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
    },
  });

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value || !selectedFile) return;
    setFiles(prev => ({ ...prev, [selectedFile]: value }));
  }, [selectedFile]);

  const handleSaveFile = useCallback(() => {
    if (!selectedFile || !files[selectedFile]) return;
    saveFileMutation.mutate({ filepath: selectedFile, content: files[selectedFile] });
  }, [selectedFile, files]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveFile]);

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    setFiles(prev => ({ ...prev, [name]: "" }));
    setSelectedFile(name);
    setNewFileName("");
    setShowNewFileInput(false);
    setFilesOpen(false);
    saveFileMutation.mutate({ filepath: name, content: "" });
  };

  const handleDeleteFile = (filepath: string) => {
    setFiles(prev => {
      const next = { ...prev };
      delete next[filepath];
      return next;
    });
    if (selectedFile === filepath) {
      const remaining = Object.keys(files).filter(f => f !== filepath);
      setSelectedFile(remaining[0] || "");
    }
  };

  const runAgent = async () => {
    if (!prompt.trim() || !projectId || isAgentRunning) return;

    setIsAgentRunning(true);
    setAgentSteps([]);
    setAgentLogs([`> Agent started (${agentMode.toUpperCase()}): "${prompt}"`]);
    setBottomTab("agent");

    const currentPrompt = prompt;
    const currentMode = agentMode;
    setPrompt("");

    try {
      const response = await fetch(`/api/projects/${projectId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, mode: currentMode }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Agent request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: AgentEvent = JSON.parse(line.slice(6));

            if (event.type === "step" && event.step) {
              setAgentSteps(prev => {
                const existing = prev.findIndex(s => s.id === event.step!.id);
                if (existing >= 0) {
                  const next = [...prev];
                  next[existing] = event.step!;
                  return next;
                }
                return [...prev, event.step!];
              });
              setAgentLogs(prev => [...prev, `[${event.step!.status}] ${event.step!.description}`]);
            }

            if (event.type === "meta") {
              const modeLabel = event.mode === "turbo" ? "Turbo" : "Standard";
              const modelLabel = event.model ? ` · ${event.model}` : "";
              setAgentLogs(prev => [...prev, `> Mode: ${modeLabel}${modelLabel}`]);
            }

            if (event.type === "result" && event.result) {
              setFiles(event.result.files);
              setEntryFile(event.result.entryFile);
              if (!selectedFile || !event.result.files[selectedFile]) {
                setSelectedFile(event.result.entryFile || Object.keys(event.result.files)[0]);
              }
              setPreviewKey(k => k + 1);

              const changedFiles = Object.keys(event.result.diffs);
              if (changedFiles.length > 0) {
                setAgentLogs(prev => [
                  ...prev,
                  `Files changed: ${changedFiles.join(", ")}`,
                  `Summary: ${event.result!.summary}`,
                ]);
              }

              if (event.result.model) {
                const modeLabel = event.result.mode === "turbo" ? "Turbo" : "Standard";
                setAgentLogs(prev => [...prev, `Model used: ${event.result!.model} (${modeLabel})`]);
              }
            }

            if (event.type === "error") {
              setAgentLogs(prev => [...prev, `ERROR: ${event.error}`]);
              toast({ title: "Agent Error", description: event.error, variant: "destructive" });
            }

            if (event.type === "done") {
              const modeLabel = event.mode === "turbo" ? "Turbo" : event.mode === "standard" ? "Standard" : currentMode === "turbo" ? "Turbo" : "Standard";
              setAgentLogs(prev => [...prev, `> Agent finished (${modeLabel})`]);
            }
          } catch {}
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
    } catch (err: any) {
      toast({ title: "Agent Error", description: err.message, variant: "destructive" });
      setAgentLogs(prev => [...prev, `ERROR: ${err.message}`]);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runAgent();
    }
  };

  const getPreviewHtml = () => {
    const entry = files[entryFile];
    if (!entry) return "";

    if (entryFile.endsWith(".html")) {
      let html = entry;
      for (const [path, content] of Object.entries(files)) {
        if (path === entryFile) continue;
        if (path.endsWith(".css")) {
          html = html.replace(
            "</head>",
            `<style>/* ${path} */\n${content}</style>\n</head>`
          );
        }
        if (path.endsWith(".js")) {
          html = html.replace(
            "</body>",
            `<script>/* ${path} */\n${content}</script>\n</body>`
          );
        }
      }
      return html;
    }

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Preview</title></head>
<body><pre>${entry.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
  };

  const liveUrl = projectId ? `${window.location.origin}/launch/${projectId}` : "";

  const copyLiveUrl = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportZip = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/export/zip`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name?.replace(/\s+/g, "-").toLowerCase() || "project"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Project downloaded as ZIP" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const fileList = Object.keys(files).sort();

  return (
    <div className="flex flex-col h-full bg-background" data-testid="studio-container">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Sheet open={filesOpen} onOpenChange={setFilesOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-toggle-files">
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="px-3 py-2 border-b">
                <SheetTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4" /> Files
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNewFileInput(true)}
                    data-testid="button-new-file-drawer"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </Button>
                </SheetTitle>
              </SheetHeader>
              {showNewFileInput && (
                <div className="flex items-center gap-1 px-3 py-2 border-b">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateFile(); if (e.key === "Escape") setShowNewFileInput(false); }}
                    placeholder="filename.ext"
                    className="flex-1 text-xs bg-transparent border-b border-primary/30 outline-none px-1 py-0.5"
                    autoFocus
                    data-testid="input-new-filename"
                  />
                </div>
              )}
              <ScrollArea className="h-[calc(100vh-80px)]">
                <div className="py-1">
                  {fileList.map(filepath => {
                    const name = filepath.split("/").pop() || filepath;
                    return (
                      <FileTreeNode
                        key={filepath}
                        name={name}
                        path={filepath}
                        isSelected={selectedFile === filepath}
                        onSelect={(p) => { setSelectedFile(p); setFilesOpen(false); }}
                        onDelete={handleDeleteFile}
                      />
                    );
                  })}
                  {fileList.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No files yet. Use the agent to generate code.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-heading font-medium truncate max-w-[200px]" data-testid="text-project-name">{project.name}</span>
          <Badge variant="outline" className="text-[10px]">{project.appType}</Badge>
          <Badge
            variant="outline"
            className={`text-[10px] gap-1 ${agentMode === "turbo" ? "border-violet-500/40 text-violet-300" : ""}`}
          >
            <Zap className="w-3 h-3" />
            {agentMode === "turbo" ? "Turbo" : "Standard"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={handleExportZip}
            data-testid="button-export-zip"
          >
            <Download className="w-3 h-3" /> Export
          </Button>
          {liveUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={copyLiveUrl}
              data-testid="button-copy-live-url"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Live URL"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(liveUrl, "_blank")}
            data-testid="button-open-live"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPreviewKey(k => k + 1)}
            data-testid="button-refresh-preview"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={50} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={65} minSize={30}>
              <div className="flex flex-col h-full">
                {selectedFile ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1 border-b bg-card/30 text-xs">
                      <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedFile}</span>
                      {saveFileMutation.isPending && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">Ctrl+S to save</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <Editor
                        height="100%"
                        language={getLanguageFromPath(selectedFile)}
                        value={files[selectedFile] || ""}
                        onChange={handleEditorChange}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineHeight: 20,
                          padding: { top: 8 },
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          tabSize: 2,
                          automaticLayout: true,
                          renderLineHighlight: "gutter",
                          smoothScrolling: true,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <FileCode className="w-10 h-10" />
                    <p className="text-sm">Select a file or use the agent to start building</p>
                  </div>
                )}
              </div>
            </Panel>

            <PanelResizeHandle className="h-1 bg-border/50 hover:bg-primary/30 transition-colors" />

            <Panel defaultSize={35} minSize={15} maxSize={60}>
              <div className="flex flex-col h-full border-t">
                <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex flex-col h-full">
                  <TabsList className="h-8 px-2 rounded-none border-b bg-card/30 justify-start gap-0">
                    <TabsTrigger value="agent" className="text-[10px] h-6 px-2 gap-1 rounded-sm" data-testid="tab-agent">
                      <Bot className="w-3 h-3" /> Agent
                    </TabsTrigger>
                    <TabsTrigger value="terminal" className="text-[10px] h-6 px-2 gap-1 rounded-sm" data-testid="tab-terminal">
                      <Terminal className="w-3 h-3" /> Terminal
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="text-[10px] h-6 px-2 gap-1 rounded-sm" data-testid="tab-chat">
                      <MessageSquare className="w-3 h-3" /> Chat
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-[10px] h-6 px-2 gap-1 rounded-sm" data-testid="tab-logs">
                      <Bug className="w-3 h-3" /> Logs
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="agent" className="flex-1 m-0 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="p-3 space-y-3">
                        <div className="rounded-lg border border-violet-500/20 bg-gradient-to-r from-slate-950/80 via-violet-950/40 to-slate-950/80 p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={nemesisAgentAvatar}
                              alt="Nemesis Agent"
                              className="h-10 w-10 rounded-md border border-violet-500/40 bg-black/60 p-1"
                              loading="lazy"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold tracking-wide text-violet-300">NEMESIS AGENT CONSOLE</p>
                              <p className="text-[11px] text-muted-foreground">
                                Cursor-style workflow, tuned for Nemesis speed and precision.
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={agentMode === "turbo" ? "border-violet-500/40 text-violet-300" : "border-border/60 text-muted-foreground"}
                            >
                              {agentMode === "turbo" ? "Turbo" : "Standard"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {quickPrompts.map((template) => (
                            <button
                              key={template}
                              type="button"
                              onClick={() => applyQuickPrompt(template)}
                              className="rounded-md border border-border/70 bg-card/40 px-2 py-1 text-[10px] text-muted-foreground hover-elevate hover:text-foreground"
                            >
                              {template}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-1.5 text-xs font-mono">
                          {agentSteps.map((step, i) => (
                            <StepIndicator key={`${step.id}-${i}`} step={step} />
                          ))}
                          {agentSteps.length === 0 && !isAgentRunning && (
                            <div className="rounded-md border border-dashed border-border/60 bg-card/20 px-3 py-4 text-center text-muted-foreground">
                              Agent ready. Beschreibe einfach dein Feature und starte.
                            </div>
                          )}
                          {isAgentRunning && (
                            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-primary">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Agent läuft auf Hochtouren...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="terminal" className="flex-1 m-0 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-0.5 text-xs font-mono text-muted-foreground">
                        {agentLogs.map((log, i) => (
                          <div key={i} className={log.startsWith("ERROR") ? "text-destructive" : log.startsWith(">") ? "text-primary" : ""}>
                            {log}
                          </div>
                        ))}
                        {agentLogs.length === 0 && (
                          <div className="text-center py-2">No logs yet</div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="chat" className="flex-1 m-0 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="p-3 space-y-3">
                        {messagesData?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`text-xs ${msg.role === "user" ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            <span className={`font-semibold ${msg.role === "user" ? "text-primary" : "text-emerald-400"}`}>
                              {msg.role === "user" ? "You" : "Agent"}:
                            </span>{" "}
                            {msg.content}
                          </div>
                        ))}
                        {(!messagesData || messagesData.length === 0) && (
                          <div className="text-center text-xs text-muted-foreground py-2">
                            Conversation history will appear here
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="logs" className="flex-1 m-0 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-1 text-xs font-mono text-muted-foreground">
                        <div className="flex items-center gap-2 py-1 text-primary">
                          <Bug className="w-3.5 h-3.5" />
                          <span>Bug Hunter Vision</span>
                        </div>
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No issues detected.</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Errors from the preview will appear here with fix suggestions.</p>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                <div className="p-2 border-t bg-card/30">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-md border border-border/70 bg-card/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setAgentMode("standard")}
                        className={`rounded px-2 py-1 text-[10px] transition-colors ${
                          agentMode === "standard"
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        disabled={isAgentRunning}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentMode("turbo")}
                        className={`rounded px-2 py-1 text-[10px] transition-colors ${
                          agentMode === "turbo"
                            ? "bg-violet-500/20 text-violet-300"
                            : "text-muted-foreground hover:text-violet-300"
                        }`}
                        disabled={isAgentRunning}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Turbo
                        </span>
                      </button>
                    </div>
                    <span className={`text-[10px] ${isAgentRunning ? "text-primary" : "text-muted-foreground"}`}>
                      {isAgentRunning
                        ? "Agent arbeitet..."
                        : agentMode === "turbo"
                          ? "Turbo: schnelle Iterationen"
                          : "Standard: maximal gründlich"}
                    </span>
                  </div>

                  <div className="rounded-lg border border-violet-500/20 bg-gradient-to-r from-black/30 via-card/60 to-black/30 p-2">
                    <div className="flex gap-2">
                      <Textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          isAgentRunning
                            ? "Agent working..."
                            : agentMode === "turbo"
                              ? 'Turbo-Modus: "Baue eine komplette Landingpage mit Formular und Dashboard"'
                              : 'Beschreibe dein Ziel... (z. B. "Add a contact form with validation")'
                        }
                        className="min-h-[56px] max-h-[140px] resize-none border-none bg-transparent text-sm focus-visible:ring-0"
                        disabled={isAgentRunning}
                        data-testid="input-agent-prompt"
                      />
                      <Button
                        size="icon"
                        onClick={runAgent}
                        disabled={!prompt.trim() || isAgentRunning}
                        className={agentMode === "turbo" ? "bg-violet-600 hover:bg-violet-500 text-white" : ""}
                        data-testid="button-send-agent"
                      >
                        {isAgentRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/30 transition-colors" />

        <Panel defaultSize={50} minSize={25}>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-3 py-1 border-b bg-card/30 text-xs">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Preview</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-auto"
                onClick={() => setPreviewKey(k => k + 1)}
                data-testid="button-refresh-preview-header"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 bg-white">
              {Object.keys(files).length > 0 ? (
                <iframe
                  key={previewKey}
                  srcDoc={getPreviewHtml()}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-modals"
                  title="Preview"
                  data-testid="preview-iframe"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-card/30 gap-3">
                  <Eye className="w-10 h-10 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
