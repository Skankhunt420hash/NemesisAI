import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RevenueInsight {
  type: "issue" | "suggestion" | "opportunity";
  title: string;
  description: string;
  impact: string;
  fix?: string;
  applied?: boolean;
}

interface RevenueAwareAIProps {
  code: string;
  appType: string;
  onSuggestionApply: (suggestion: string) => void;
}

export function RevenueAwareAI({ code, appType, onSuggestionApply }: RevenueAwareAIProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<RevenueInsight[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  const analyzeRevenue = async () => {
    if (!code) {
      toast({ title: "No Code", description: "Generate an app first", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setInsights([]);
    setOverallScore(null);

    await new Promise(r => setTimeout(r, 1500));

    const newInsights: RevenueInsight[] = [];

    const hasCTA = code.includes("button") || code.includes("Button");
    const hasForm = code.includes("form") || code.includes("Form");
    const hasPayment = code.includes("stripe") || code.includes("payment") || code.includes("checkout");
    const hasLogin = code.includes("login") || code.includes("auth") || code.includes("sign");
    const hasPricing = code.includes("price") || code.includes("$") || code.includes("plan");

    if (!hasCTA) {
      newInsights.push({
        type: "issue",
        title: "Missing Call-to-Action",
        description: "No clear CTA buttons detected. Users need a clear next step.",
        impact: "~40% conversion loss",
        fix: "Add prominent CTA buttons above the fold"
      });
    }

    if (hasForm && !code.includes("onSubmit")) {
      newInsights.push({
        type: "issue",
        title: "Form Without Handler",
        description: "Forms exist but lack proper submission handling.",
        impact: "~23% drop-off at form submission",
        fix: "Add form validation and submit handlers"
      });
    }

    if (!hasPayment && hasPricing) {
      newInsights.push({
        type: "suggestion",
        title: "Add Payment Integration",
        description: "Pricing is displayed but no payment flow exists.",
        impact: "+15-30% revenue potential",
        fix: "Integrate Stripe for seamless checkout"
      });
    }

    if (!hasLogin) {
      newInsights.push({
        type: "suggestion",
        title: "Consider User Accounts",
        description: "No authentication detected. Accounts enable retention.",
        impact: "+25% returning users",
        fix: "Add simple email/social login"
      });
    }

    if (code.includes("loading") || code.includes("spinner")) {
      newInsights.push({
        type: "opportunity",
        title: "Loading State Monetization",
        description: "Show upgrade prompts during loading states.",
        impact: "+5% upgrade conversions",
        fix: "Add 'Skip with Pro' option during waits"
      });
    }

    newInsights.push({
      type: "opportunity",
      title: "Exit Intent Popup",
      description: "Capture leaving users with a special offer.",
      impact: "+10% recovered conversions",
      fix: "Add exit-intent detection with offer modal"
    });

    if (!code.includes("trust") && !code.includes("badge") && !code.includes("secure")) {
      newInsights.push({
        type: "suggestion",
        title: "Add Trust Signals",
        description: "No trust badges or security indicators found.",
        impact: "+12% checkout completions",
        fix: "Add SSL badge, money-back guarantee, testimonials"
      });
    }

    newInsights.push({
      type: "opportunity",
      title: "Tiered Pricing Psychology",
      description: "Use decoy pricing to guide choice.",
      impact: "+18% revenue per user",
      fix: "Add 3-tier pricing with highlighted 'popular' option"
    });

    const issueCount = newInsights.filter(i => i.type === "issue").length;
    const score = Math.max(0, 100 - (issueCount * 20) - (newInsights.filter(i => i.type === "suggestion").length * 5));
    
    setOverallScore(score);
    setInsights(newInsights);
    setIsAnalyzing(false);

    toast({
      title: "Revenue Analysis Complete",
      description: `Found ${newInsights.length} optimization opportunities`
    });
  };

  const applyFix = (insight: RevenueInsight, index: number) => {
    if (insight.fix) {
      onSuggestionApply(insight.fix);
      setInsights(prev => prev.map((i, idx) => 
        idx === index ? { ...i, applied: true } : i
      ));
      toast({
        title: "Suggestion Applied",
        description: insight.fix
      });
    }
  };

  const getInsightIcon = (type: RevenueInsight["type"]) => {
    switch (type) {
      case "issue": return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "suggestion": return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      case "opportunity": return <Sparkles className="w-4 h-4 text-green-400" />;
    }
  };

  return (
    <Card className="bg-black/40 border-violet-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-violet-400" />
          Revenue-Aware AI
          <Badge variant="outline" className="ml-auto text-xs border-green-500/30 text-green-400">
            Growth Hacker
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={analyzeRevenue}
          disabled={isAnalyzing || !code}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
          data-testid="button-analyze-revenue"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Conversion Flow...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Analyze Revenue Potential
            </>
          )}
        </Button>

        {overallScore !== null && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-violet-500/20" data-testid="revenue-score-display">
            <div>
              <p className="text-xs text-muted-foreground">Conversion Readiness</p>
              <p className="text-2xl font-bold" data-testid="text-revenue-score">{overallScore}%</p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              overallScore >= 80 ? "bg-green-500/20 text-green-400" :
              overallScore >= 50 ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    insight.applied ? "border-green-500/30 bg-green-500/5" : "border-violet-500/20 bg-black/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {insight.applied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                    ) : (
                      getInsightIcon(insight.type)
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{insight.title}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            insight.type === "issue" ? "border-red-500/30 text-red-400" :
                            insight.type === "suggestion" ? "border-yellow-500/30 text-yellow-400" :
                            "border-green-500/30 text-green-400"
                          }`}
                        >
                          {insight.impact}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      {insight.fix && !insight.applied && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applyFix(insight, index)}
                          className="mt-2 h-6 text-xs"
                          data-testid={`button-apply-fix-${index}`}
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Apply Fix
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Builder + Growth Hacker in one
        </p>
      </CardContent>
    </Card>
  );
}
