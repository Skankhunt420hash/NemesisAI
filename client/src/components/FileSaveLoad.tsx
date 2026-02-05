import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, FileDown, FileUp, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectSnapshot {
  version: string;
  savedAt: string;
  projectId: number | null;
  name: string;
  appType: string;
  code: string;
  chatHistory: Array<{ role: string; content: string }>;
  preferences: Record<string, unknown>;
  buildSteps: Array<{ step: string; status: string }>;
}

interface FileSaveLoadProps {
  projectId: number | null;
  projectName: string;
  appType: string;
  code: string;
  chatHistory: Array<{ role: string; content: string }>;
  onLoad: (snapshot: ProjectSnapshot) => void;
}

export function FileSaveLoad({ 
  projectId, 
  projectName, 
  appType, 
  code, 
  chatHistory,
  onLoad 
}: FileSaveLoadProps) {
  const { toast } = useToast();
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createSnapshot = (): ProjectSnapshot => ({
    version: "1.0.0",
    savedAt: new Date().toISOString(),
    projectId,
    name: projectName || "Untitled Project",
    appType: appType || "web",
    code: code || "",
    chatHistory: chatHistory || [],
    preferences: JSON.parse(localStorage.getItem("nemesis_decision_memory") || "{}"),
    buildSteps: []
  });

  const handleSaveToFile = () => {
    try {
      const snapshot = createSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${snapshot.name.replace(/\s+/g, "_")}_${Date.now()}.nemesis`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setLastSaved(new Date().toLocaleTimeString());
      toast({
        title: "Project Saved",
        description: `${snapshot.name}.nemesis downloaded successfully`
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save project file",
        variant: "destructive"
      });
    }
  };

  const handleLoadFromFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".nemesis,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
        const text = await file.text();
        const snapshot = JSON.parse(text) as ProjectSnapshot;
        
        if (!snapshot.version || !snapshot.code) {
          throw new Error("Invalid project file format");
        }

        onLoad(snapshot);
        toast({
          title: "Project Loaded",
          description: `${snapshot.name} restored from ${new Date(snapshot.savedAt).toLocaleDateString()}`
        });
      } catch (error) {
        toast({
          title: "Load Failed",
          description: "Invalid or corrupted project file",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  const handleQuickSave = () => {
    try {
      const snapshot = createSnapshot();
      localStorage.setItem(`nemesis_quicksave_${projectId || "draft"}`, JSON.stringify(snapshot));
      setLastSaved(new Date().toLocaleTimeString());
      toast({
        title: "Quick Save",
        description: "Progress saved locally"
      });
    } catch (error) {
      toast({
        title: "Quick Save Failed",
        description: "Could not save to local storage",
        variant: "destructive"
      });
    }
  };

  const handleQuickLoad = () => {
    try {
      const saved = localStorage.getItem(`nemesis_quicksave_${projectId || "draft"}`);
      if (!saved) {
        toast({
          title: "No Quick Save Found",
          description: "No local save exists for this project"
        });
        return;
      }
      
      const snapshot = JSON.parse(saved) as ProjectSnapshot;
      onLoad(snapshot);
      toast({
        title: "Quick Load",
        description: `Restored from ${new Date(snapshot.savedAt).toLocaleTimeString()}`
      });
    } catch (error) {
      toast({
        title: "Quick Load Failed",
        description: "Could not load from local storage",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-black/40 border-violet-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Save className="w-4 h-4 text-violet-400" />
          Save / Load Project
          {lastSaved && (
            <Badge variant="outline" className="ml-auto text-xs border-green-500/30 text-green-400">
              <Clock className="w-3 h-3 mr-1" />
              {lastSaved}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSaveToFile}
            className="border-violet-500/30 hover:bg-violet-500/10"
            data-testid="button-save-file"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Save to File
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleLoadFromFile}
            disabled={isLoading}
            className="border-violet-500/30 hover:bg-violet-500/10"
            data-testid="button-load-file"
          >
            <FileUp className="w-4 h-4 mr-2" />
            Load File
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleQuickSave}
            className="text-muted-foreground"
            data-testid="button-quick-save"
          >
            <Save className="w-3 h-3 mr-2" />
            Quick Save
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleQuickLoad}
            className="text-muted-foreground"
            data-testid="button-quick-load"
          >
            <Upload className="w-3 h-3 mr-2" />
            Quick Load
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          .nemesis files preserve code, chat history & preferences
        </p>
      </CardContent>
    </Card>
  );
}
