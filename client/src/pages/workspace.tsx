import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  AlertCircle,
  CheckCircle2,
  Clock,
  Minus,
  X,
} from "lucide-react";
import type { GeneratedApp, ProjectMessage, ProjectFiles, AgentStep } from "@shared/schema";

interface AgentEvent {
  type: "step" | "stream" | "result" | "error" | "done";
  step?: AgentStep;
  content?: string;
  result?: {
    plan: string[];
    files: ProjectFiles;
    entryFile: string;
    diffs: Record<string, string>;
    summary: string;
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

  return (
    <div className="flex items-center gap-2 text-xs py-1">
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
      <span className={step.status === "running" ? "text-primary" : "text-muted-foreground"}>
        {step.description}
      </span>
    </div>
  );
}

export default function WorkspacePage() {
  const { user } = useAuth();
  const [, params] = useRoute("/workspace/:id");
  const projectId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const [files, setFiles] = useState<ProjectFiles>({});
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [entryFile, setEntryFile] = useState<string>("index.html");
  const [prompt, setPrompt] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [bottomTab, setBottomTab] = useState("agent");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setAgentLogs([`> Agent started: "${prompt}"`]);
    setBottomTab("agent");

    const currentPrompt = prompt;
    setPrompt("");

    try {
      const response = await fetch(`/api/projects/${projectId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt }),
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
            }

            if (event.type === "error") {
              setAgentLogs(prev => [...prev, `ERROR: ${event.error}`]);
              toast({ title: "Agent Error", description: event.error, variant: "destructive" });
            }

            if (event.type === "done") {
              setAgentLogs(prev => [...prev, "> Agent finished"]);
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
    <div className="flex flex-col h-full bg-background" data-testid="workspace-container">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-heading font-medium truncate max-w-[200px]">{project.name}</span>
          <Badge variant="outline" className="text-[10px]">{project.appType}</Badge>
        </div>
        <div className="flex items-center gap-1">
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
        <Panel defaultSize={18} minSize={12} maxSize={30}>
          <div className="flex flex-col h-full border-r bg-card/30">
            <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-b">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Files</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowNewFileInput(true)}
                data-testid="button-new-file"
              >
                <FilePlus className="w-3 h-3" />
              </Button>
            </div>
            {showNewFileInput && (
              <div className="flex items-center gap-1 px-2 py-1 border-b">
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
            <ScrollArea className="flex-1">
              <div className="py-1">
                {fileList.map(filepath => {
                  const name = filepath.split("/").pop() || filepath;
                  return (
                    <FileTreeNode
                      key={filepath}
                      name={name}
                      path={filepath}
                      isSelected={selectedFile === filepath}
                      onSelect={setSelectedFile}
                      onDelete={handleDeleteFile}
                    />
                  );
                })}
                {fileList.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No files yet. Use the agent to generate your project.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/30 transition-colors" />

        <Panel defaultSize={42} minSize={25}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={30}>
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
                    <p className="text-sm">Select a file to edit or use the agent to start building</p>
                  </div>
                )}
              </div>
            </Panel>

            <PanelResizeHandle className="h-1 bg-border/50 hover:bg-primary/30 transition-colors" />

            <Panel defaultSize={30} minSize={15} maxSize={60}>
              <div className="flex flex-col h-full border-t">
                <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex flex-col h-full">
                  <TabsList className="h-7 px-2 rounded-none border-b bg-card/30 justify-start gap-0">
                    <TabsTrigger value="agent" className="text-[10px] h-6 px-2 gap-1 rounded-sm" data-testid="tab-agent">
                      <Bot className="w-3 h-3" />
                      Agent
                    </TabsTrigger>
                    <TabsTrigger value="terminal" className="text-[10px] h-6 px-2 gap-1 rounded-sm" data-testid="tab-terminal">
                      <Terminal className="w-3 h-3" />
                      Terminal
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="agent" className="flex-1 m-0 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-1 text-xs font-mono">
                        {agentSteps.map((step, i) => (
                          <StepIndicator key={`${step.id}-${i}`} step={step} />
                        ))}
                        {agentSteps.length === 0 && !isAgentRunning && (
                          <div className="text-muted-foreground py-2 text-center">
                            Agent ready. Type a command below to start.
                          </div>
                        )}
                        {isAgentRunning && (
                          <div className="flex items-center gap-2 text-primary py-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Working...</span>
                          </div>
                        )}
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
                </Tabs>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/30 transition-colors" />

        <Panel defaultSize={40} minSize={20}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={30}>
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-3 py-1 border-b bg-card/30 text-xs">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Preview</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-auto"
                    onClick={() => setPreviewKey(k => k + 1)}
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

            <PanelResizeHandle className="h-1 bg-border/50 hover:bg-primary/30 transition-colors" />

            <Panel defaultSize={30} minSize={15} maxSize={50}>
              <div className="flex flex-col h-full border-t">
                <div className="flex items-center gap-2 px-3 py-1 border-b bg-card/30 text-xs">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Chat</span>
                </div>
                <ScrollArea className="flex-1 min-h-0">
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
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-2 border-t">
                  <div className="flex gap-1.5">
                    <Textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isAgentRunning ? "Agent working..." : 'Tell the agent what to do... (e.g. "Add a dark mode toggle")'}
                      className="min-h-[36px] max-h-[80px] text-xs resize-none bg-card/50"
                      disabled={isAgentRunning}
                      data-testid="input-agent-prompt"
                    />
                    <Button
                      size="icon"
                      onClick={runAgent}
                      disabled={!prompt.trim() || isAgentRunning}
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
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
