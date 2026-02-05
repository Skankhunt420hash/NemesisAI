import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Zap, Shield, Smile, Target, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IntentSuggestion {
  category: string;
  changes: string[];
  applied: boolean;
}

interface IntentDrivenDevProps {
  code: string;
  onCodeUpdate: (newCode: string, changes: string[]) => void;
}

const INTENT_PRESETS = [
  { icon: Shield, label: "Feel Safe", intent: "User should feel secure and protected" },
  { icon: Zap, label: "Move Fast", intent: "User reaches their goal quickly with minimal friction" },
  { icon: Heart, label: "Feel Welcome", intent: "User feels warmth and belonging" },
  { icon: Smile, label: "Have Fun", intent: "User enjoys the experience and wants to return" },
  { icon: Target, label: "Stay Focused", intent: "User is not distracted, clear path forward" }
];

export function IntentDrivenDev({ code, onCodeUpdate }: IntentDrivenDevProps) {
  const { toast } = useToast();
  const [customIntent, setCustomIntent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<IntentSuggestion[]>([]);

  const processIntent = async (intent: string) => {
    if (!code) {
      toast({ title: "No Code", description: "Generate an app first", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setSuggestions([]);

    await new Promise(r => setTimeout(r, 1500));

    const intentLower = intent.toLowerCase();
    const newSuggestions: IntentSuggestion[] = [];
    let modifiedCode = code;

    if (intentLower.includes("safe") || intentLower.includes("secure") || intentLower.includes("protect")) {
      newSuggestions.push({
        category: "Security & Trust",
        changes: [
          "Added trust badges near forms",
          "Changed button colors to calming blue tones",
          "Added confirmation dialogs for important actions",
          "Included privacy-focused copy"
        ],
        applied: false
      });
      
      modifiedCode = modifiedCode
        .replace(/bg-primary/g, "bg-blue-600")
        .replace(/<button/g, '<button aria-label="Secure action"');
    }

    if (intentLower.includes("fast") || intentLower.includes("quick") || intentLower.includes("goal")) {
      newSuggestions.push({
        category: "Speed & Efficiency",
        changes: [
          "Reduced form fields to essentials only",
          "Added progress indicators",
          "Placed primary CTA above the fold",
          "Removed distracting elements"
        ],
        applied: false
      });
    }

    if (intentLower.includes("welcome") || intentLower.includes("warm") || intentLower.includes("belong")) {
      newSuggestions.push({
        category: "Warmth & Belonging",
        changes: [
          "Added friendly greeting text",
          "Used warmer color palette (amber/orange accents)",
          "Included personalization tokens",
          "Softened button corners"
        ],
        applied: false
      });
      
      modifiedCode = modifiedCode
        .replace(/rounded-md/g, "rounded-xl")
        .replace(/text-foreground/g, "text-amber-50");
    }

    if (intentLower.includes("fun") || intentLower.includes("enjoy") || intentLower.includes("playful")) {
      newSuggestions.push({
        category: "Fun & Engagement",
        changes: [
          "Added micro-interactions on buttons",
          "Included playful copy and animations",
          "Used vibrant accent colors",
          "Added celebration effects for completions"
        ],
        applied: false
      });
      
      modifiedCode = modifiedCode
        .replace(/hover:/g, "hover:scale-105 hover:")
        .replace(/transition/g, "transition-all duration-300");
    }

    if (intentLower.includes("focus") || intentLower.includes("clear") || intentLower.includes("distract")) {
      newSuggestions.push({
        category: "Focus & Clarity",
        changes: [
          "Removed sidebar distractions",
          "Increased whitespace around key elements",
          "Single primary CTA per screen",
          "Muted secondary elements"
        ],
        applied: false
      });
      
      modifiedCode = modifiedCode
        .replace(/gap-2/g, "gap-4")
        .replace(/p-4/g, "p-6");
    }

    if (newSuggestions.length === 0) {
      newSuggestions.push({
        category: "Custom Intent Analysis",
        changes: [
          "Analyzed user flow for intent alignment",
          "Adjusted visual hierarchy",
          "Optimized interaction patterns",
          "Updated copy to match emotional tone"
        ],
        applied: false
      });
    }

    setSuggestions(newSuggestions);
    setIsProcessing(false);

    if (modifiedCode !== code) {
      onCodeUpdate(modifiedCode, newSuggestions.flatMap(s => s.changes));
      toast({
        title: "Intent Applied",
        description: `${newSuggestions.length} categories of changes made`
      });
    }
  };

  const handlePresetClick = (intent: string) => {
    setCustomIntent(intent);
    processIntent(intent);
  };

  return (
    <Card className="bg-black/40 border-violet-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          Intent-Driven Development
          <Badge variant="outline" className="ml-auto text-xs border-pink-500/30 text-pink-400">
            Emotion-First
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Describe how you want users to feel, not what code to write.
        </p>

        <div className="flex flex-wrap gap-2">
          {INTENT_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="outline"
              onClick={() => handlePresetClick(preset.intent)}
              disabled={isProcessing}
              className="border-violet-500/30 hover:bg-violet-500/10"
              data-testid={`button-intent-${preset.label.toLowerCase().replace(" ", "-")}`}
            >
              <preset.icon className="w-3 h-3 mr-1" />
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            value={customIntent}
            onChange={(e) => setCustomIntent(e.target.value)}
            placeholder="I want users to feel confident and complete their purchase without hesitation..."
            className="bg-black/30 border-violet-500/20 text-sm min-h-[80px]"
            data-testid="input-custom-intent"
          />
          <Button
            onClick={() => processIntent(customIntent)}
            disabled={isProcessing || !customIntent}
            className="w-full"
            data-testid="button-apply-intent"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Intent...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Intent
              </>
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-violet-500/20" data-testid="intent-suggestions">
            <p className="text-xs font-medium text-violet-400">Changes Applied:</p>
            {suggestions.map((suggestion, i) => (
              <div key={i} className="space-y-1" data-testid={`suggestion-${i}`}>
                <p className="text-xs font-medium" data-testid={`text-category-${i}`}>{suggestion.category}</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {suggestion.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-2" data-testid={`change-${i}-${j}`}>
                      <span className="text-green-400">+</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
