import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Mic,
  MicOff,
  Globe,
  Gamepad2,
  Glasses,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Volume2,
  Wifi,
  WifiOff,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

type STTMode = "local" | "cloud";

interface WizardStep {
  id: string;
  question: string;
  field: string;
  options?: string[];
}

const wizardSteps: WizardStep[] = [
  { id: "goal", question: "What kind of app do you want to build? Describe your idea.", field: "goal" },
  { id: "platform", question: "Which platform?", field: "platform", options: ["Web App", "Native Mobile", "3D Game", "VR World"] },
  { id: "auth", question: "Does your app need user login/registration?", field: "auth", options: ["Yes", "No", "Maybe later"] },
  { id: "database", question: "Do you need to store data (database)?", field: "database", options: ["Yes", "No", "Simple local storage"] },
  { id: "style", question: "What visual style do you prefer?", field: "style", options: ["Modern & Clean", "Dark & Bold", "Colorful & Fun", "Minimal & Simple"] },
];

export default function VoicePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sttMode, setSttMode] = useState<STTMode>("cloud");
  const [isRecording, setIsRecording] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [transcript, setTranscript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [wizardStarted, setWizardStarted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const canAccess = user?.isAdmin || user?.isPro;
  const progress = wizardStarted ? ((currentStep + 1) / wizardSteps.length) * 100 : 0;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());

        if (sttMode === "cloud") {
          try {
            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");
            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
              credentials: "include",
            });
            if (res.ok) {
              const data = await res.json();
              setTranscript(data.text || "");
              handleAnswer(data.text || "");
            }
          } catch {
            toast({ title: "Transcription failed", description: "Could not process audio", variant: "destructive" });
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone error", description: "Could not access microphone", variant: "destructive" });
    }
  }, [sttMode, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleAnswer = (answer: string) => {
    const step = wizardSteps[currentStep];
    if (!step) return;
    setAnswers((prev) => ({ ...prev, [step.field]: answer }));
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep((s) => s + 1);
      setTranscript("");
    }
  };

  const handleOptionSelect = (option: string) => {
    handleAnswer(option);
  };

  const handleGenerate = async () => {
    if (!canAccess) {
      toast({ title: "Pro Required", description: "Upgrade to Pro to use Voice Studio.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const platformMap: Record<string, { appType: string; language: string }> = {
        "Web App": { appType: "web", language: "react" },
        "Native Mobile": { appType: "native", language: "react-native" },
        "3D Game": { appType: "3d-game", language: "threejs" },
        "VR World": { appType: "vr-world", language: "aframe" },
      };

      const platform = platformMap[answers.platform] || platformMap["Web App"];
      const prompt = `Build an app: ${answers.goal}. Platform: ${answers.platform}. Auth: ${answers.auth}. Database: ${answers.database}. Style: ${answers.style}.`;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Voice Project - ${new Date().toLocaleDateString()}`,
          appType: platform.appType,
          language: platform.language,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create project");
      const project = await res.json();

      const iterRes = await fetch(`/api/projects/${project.id}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        credentials: "include",
      });

      if (!iterRes.ok) throw new Error("Generation failed");

      const reader = iterRes.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      toast({ title: "Project created!", description: "Opening in Studio..." });
      setLocation(`/studio/${project.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!wizardStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6 glow-cyan-subtle">
            <Volume2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold mb-3" data-testid="text-voice-title">
            Voice Studio
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Speak your app idea into existence. Answer a few questions and we'll build it for you.
          </p>
        </div>

        <div className="flex gap-4 mb-8">
          <Card
            className={`cursor-pointer hover-elevate w-48 ${sttMode === "local" ? "border-primary" : ""}`}
            onClick={() => setSttMode("local")}
            data-testid="card-stt-local"
          >
            <CardContent className="p-4 text-center">
              <WifiOff className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Local Voice</p>
              <p className="text-[10px] text-muted-foreground mt-1">Privacy-first, offline</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer hover-elevate w-48 ${sttMode === "cloud" ? "border-primary" : ""}`}
            onClick={() => setSttMode("cloud")}
            data-testid="card-stt-cloud"
          >
            <CardContent className="p-4 text-center">
              <Wifi className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Cloud Voice</p>
              <p className="text-[10px] text-muted-foreground mt-1">More accurate</p>
            </CardContent>
          </Card>
        </div>

        <Button onClick={() => setWizardStarted(true)} className="gap-2" data-testid="button-start-wizard">
          <Mic className="w-4 h-4" />
          Start Voice Wizard
        </Button>
      </div>
    );
  }

  const step = wizardSteps[currentStep];
  const isComplete = currentStep >= wizardSteps.length - 1 && answers[wizardSteps[wizardSteps.length - 1].field];

  return (
    <div className="h-full flex flex-col p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-heading font-semibold" data-testid="text-wizard-step">
            Step {currentStep + 1} of {wizardSteps.length}
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {sttMode === "cloud" ? "Cloud STT" : "Local STT"}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5" data-testid="progress-wizard" />
      </div>

      {!isComplete ? (
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl" data-testid="text-wizard-question">{step?.question}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {step?.options ? (
              <div className="grid grid-cols-2 gap-3">
                {step.options.map((option) => (
                  <Button
                    key={option}
                    variant={answers[step.field] === option ? "default" : "outline"}
                    className="h-auto py-3 text-sm"
                    onClick={() => handleOptionSelect(option)}
                    data-testid={`button-option-${option.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                {transcript && (
                  <p className="text-sm text-center bg-muted/50 rounded-md p-3 w-full" data-testid="text-transcript">
                    {transcript}
                  </p>
                )}
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className="rounded-full w-16 h-16"
                  onClick={isRecording ? stopRecording : startRecording}
                  data-testid="button-record"
                >
                  {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {isRecording ? "Listening... click to stop" : "Click to speak your answer"}
                </p>
                {transcript && (
                  <Button onClick={() => handleAnswer(transcript)} data-testid="button-confirm-answer">
                    Confirm & Continue <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-between mt-auto pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCurrentStep((s) => Math.max(0, s - 1)); setTranscript(""); }}
                disabled={currentStep === 0}
                data-testid="button-wizard-back"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Ready to Generate
            </CardTitle>
            <CardDescription>Review your choices and generate your app</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="space-y-3">
              {wizardSteps.map((s) => (
                <div key={s.id} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{s.field}</Badge>
                  <span className="text-muted-foreground">{answers[s.field] || "Not answered"}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-4 flex gap-3">
              <Button variant="outline" onClick={() => { setCurrentStep(0); setAnswers({}); setTranscript(""); }} data-testid="button-restart-wizard">
                Start Over
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1 gap-2" data-testid="button-generate-from-voice">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? "Generating..." : "Generate App"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
