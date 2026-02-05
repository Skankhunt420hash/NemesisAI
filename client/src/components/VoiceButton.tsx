import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({ onTranscript, disabled, className }: VoiceButtonProps) {
  const { state, startRecording, stopRecording, error } = useVoiceRecorder();
  const [transcribing, setTranscribing] = useState(false);

  const handleClick = async () => {
    if (state === "recording") {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob);
          
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          
          if (!response.ok) {
            throw new Error("Transcription failed");
          }
          
          const data = await response.json();
          if (data.text) {
            onTranscript(data.text);
          }
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setTranscribing(false);
        }
      }
    } else if (state === "idle" && !transcribing) {
      await startRecording();
    }
  };

  const isActive = state === "recording";
  const isLoading = state === "processing" || transcribing;

  return (
    <Button
      type="button"
      variant={isActive ? "destructive" : "outline"}
      size="icon"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "relative transition-all duration-300",
        isActive && "animate-pulse ring-2 ring-destructive ring-offset-2 ring-offset-background",
        className
      )}
      data-testid="button-voice"
      title={isActive ? "Stop recording" : "Start voice command"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isActive ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {isActive && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
      )}
    </Button>
  );
}
