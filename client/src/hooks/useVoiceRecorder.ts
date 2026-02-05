import { useState, useRef, useCallback } from "react";

type RecordingState = "idle" | "recording" | "processing";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setState("recording");
    } catch (err: any) {
      setError(err.message || "Failed to access microphone");
      setState("idle");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      setState("processing");

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        mediaRecorderRef.current?.stream
          .getTracks()
          .forEach((track) => track.stop());
        
        setState("idle");
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setState("idle");
    }
  }, [state]);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === "recording",
    isProcessing: state === "processing",
  };
}
