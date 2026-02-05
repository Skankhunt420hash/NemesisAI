import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, RotateCcw, CheckCircle2, Clock, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Checkpoint {
  id: string;
  timestamp: Date;
  code: string;
  status: "stable" | "unstable";
  label: string;
}

interface PanicButtonProps {
  currentCode: string;
  onRestore: (code: string) => void;
  onPreviewRestart: () => void;
}

export function PanicButton({ currentCode, onRestore, onPreviewRestart }: PanicButtonProps) {
  const { toast } = useToast();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isPanicking, setIsPanicking] = useState(false);
  const [lastStable, setLastStable] = useState<Checkpoint | null>(null);

  useEffect(() => {
    if (currentCode && currentCode.length > 100) {
      const existingCheckpoints = JSON.parse(
        localStorage.getItem("nemesis_checkpoints") || "[]"
      ) as Checkpoint[];

      const isDuplicate = existingCheckpoints.some(cp => cp.code === currentCode);
      
      if (!isDuplicate) {
        const newCheckpoint: Checkpoint = {
          id: Date.now().toString(),
          timestamp: new Date(),
          code: currentCode,
          status: "stable",
          label: `Checkpoint ${existingCheckpoints.length + 1}`
        };

        const updated = [...existingCheckpoints, newCheckpoint].slice(-10);
        setCheckpoints(updated);
        setLastStable(newCheckpoint);
        localStorage.setItem("nemesis_checkpoints", JSON.stringify(updated));
      } else {
        setCheckpoints(existingCheckpoints);
        const stable = existingCheckpoints.filter(cp => cp.status === "stable").pop();
        if (stable) setLastStable(stable);
      }
    }
  }, [currentCode]);

  const handlePanic = async () => {
    if (!lastStable) {
      toast({
        title: "No Stable Checkpoint",
        description: "No previous stable state to restore",
        variant: "destructive"
      });
      return;
    }

    setIsPanicking(true);

    await new Promise(r => setTimeout(r, 1000));

    onRestore(lastStable.code);
    
    await new Promise(r => setTimeout(r, 500));
    
    onPreviewRestart();

    setIsPanicking(false);

    toast({
      title: "Safe Mode Activated",
      description: `Restored to ${lastStable.label} from ${new Date(lastStable.timestamp).toLocaleTimeString()}`
    });
  };

  const handleRestoreCheckpoint = async (checkpoint: Checkpoint) => {
    onRestore(checkpoint.code);
    
    await new Promise(r => setTimeout(r, 500));
    onPreviewRestart();

    toast({
      title: "Checkpoint Restored",
      description: `Restored to ${checkpoint.label}`
    });
  };

  const markCurrentAsStable = () => {
    if (!currentCode) return;

    const newCheckpoint: Checkpoint = {
      id: Date.now().toString(),
      timestamp: new Date(),
      code: currentCode,
      status: "stable",
      label: `Stable ${checkpoints.filter(c => c.status === "stable").length + 1}`
    };

    const updated = [...checkpoints, newCheckpoint].slice(-10);
    setCheckpoints(updated);
    setLastStable(newCheckpoint);
    localStorage.setItem("nemesis_checkpoints", JSON.stringify(updated));

    toast({
      title: "Marked as Stable",
      description: "Current state saved as a stable checkpoint"
    });
  };

  return (
    <Card className="bg-black/40 border-red-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-400" />
          Panic Button / Safe Mode
          {lastStable && (
            <Badge variant="outline" className="ml-auto text-xs border-green-500/30 text-green-400">
              <Shield className="w-3 h-3 mr-1" />
              Protected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handlePanic}
          disabled={isPanicking || !lastStable}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold"
          size="lg"
          data-testid="button-panic"
        >
          {isPanicking ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Restoring Safe State...
            </>
          ) : (
            <>
              <AlertOctagon className="w-5 h-5 mr-2" />
              PANIC - RESTORE LAST STABLE
            </>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            onClick={markCurrentAsStable}
            variant="outline"
            size="sm"
            className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
            disabled={!currentCode}
            data-testid="button-mark-stable"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Current as Stable
          </Button>
        </div>

        {lastStable && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30" data-testid="last-stable-info">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs font-medium text-green-400" data-testid="text-stable-label">Last Stable State</p>
                <p className="text-xs text-muted-foreground" data-testid="text-stable-time">
                  {lastStable.label} • {new Date(lastStable.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {checkpoints.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Checkpoints</p>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {checkpoints.slice(-5).reverse().map((cp) => (
                <div 
                  key={cp.id}
                  className="flex items-center justify-between p-2 rounded-md bg-black/30 hover:bg-black/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {cp.status === "stable" ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-xs">{cp.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cp.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestoreCheckpoint(cp)}
                    className="h-6"
                    data-testid={`button-restore-${cp.id}`}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          For mental safety. One click to go back.
        </p>
      </CardContent>
    </Card>
  );
}
