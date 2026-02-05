import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Shield, Palette, TrendingUp, Server, CheckCircle2, Loader2, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScoreCategory {
  id: string;
  name: string;
  icon: typeof Shield;
  score: number;
  details: string;
  color: string;
}

interface ConfidenceScoreProps {
  code: string;
  appType: string;
}

export function ConfidenceScore({ code, appType }: ConfidenceScoreProps) {
  const { toast } = useToast();
  const [isScoring, setIsScoring] = useState(false);
  const [scores, setScores] = useState<ScoreCategory[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [wouldShip, setWouldShip] = useState<boolean | null>(null);

  const calculateScores = async () => {
    if (!code) {
      toast({ title: "No Code", description: "Generate an app first", variant: "destructive" });
      return;
    }

    setIsScoring(true);
    setScores([]);
    setOverallScore(null);
    setVerdict(null);
    setWouldShip(null);

    await new Promise(r => setTimeout(r, 1500));

    const hasErrorHandling = code.includes("try") || code.includes("catch") || code.includes("error");
    const hasLoading = code.includes("loading") || code.includes("isLoading") || code.includes("pending");
    const hasValidation = code.includes("validate") || code.includes("required") || code.includes("schema");
    
    const stabilityScore = Math.min(100, 
      (hasErrorHandling ? 30 : 0) + 
      (hasLoading ? 25 : 0) + 
      (hasValidation ? 25 : 0) +
      (code.length > 500 ? 20 : 10)
    );

    const noInnerHTML = !code.includes("innerHTML");
    const noEval = !code.includes("eval(");
    const noSecrets = !/(api[_-]?key|secret|password)\s*[:=]\s*["'][^"']+["']/i.test(code);
    const hasHttps = !code.includes("http://") || code.includes("localhost");
    
    const securityScore = Math.min(100,
      (noInnerHTML ? 25 : 0) +
      (noEval ? 25 : 0) +
      (noSecrets ? 30 : 0) +
      (hasHttps ? 20 : 0)
    );

    const hasTailwind = code.includes("className=");
    const hasResponsive = code.includes("sm:") || code.includes("md:") || code.includes("lg:");
    const hasAnimations = code.includes("animate-") || code.includes("transition");
    const hasAccessibility = code.includes("aria-") || code.includes("role=");
    
    const uxScore = Math.min(100,
      (hasTailwind ? 25 : 10) +
      (hasResponsive ? 25 : 0) +
      (hasAnimations ? 20 : 10) +
      (hasAccessibility ? 20 : 0) +
      (hasLoading ? 10 : 0)
    );

    const hasComponents = (code.match(/function\s+\w+|const\s+\w+\s*=/g) || []).length >= 3;
    const hasModular = code.includes("export") || code.includes("import");
    const hasState = code.includes("useState") || code.includes("state");
    const hasEffects = code.includes("useEffect");
    
    const scalabilityScore = Math.min(100,
      (hasComponents ? 30 : 10) +
      (hasModular ? 25 : 0) +
      (hasState ? 20 : 10) +
      (hasEffects ? 15 : 0) +
      (code.length < 5000 ? 10 : 0)
    );

    const newScores: ScoreCategory[] = [
      {
        id: "stability",
        name: "Stability",
        icon: Server,
        score: stabilityScore,
        details: hasErrorHandling ? "Error handling present" : "Add error boundaries",
        color: stabilityScore >= 70 ? "text-green-400" : stabilityScore >= 40 ? "text-yellow-400" : "text-red-400"
      },
      {
        id: "security",
        name: "Security",
        icon: Shield,
        score: securityScore,
        details: noSecrets ? "No exposed secrets" : "Remove hardcoded credentials",
        color: securityScore >= 70 ? "text-green-400" : securityScore >= 40 ? "text-yellow-400" : "text-red-400"
      },
      {
        id: "ux",
        name: "UX Quality",
        icon: Palette,
        score: uxScore,
        details: hasAccessibility ? "Accessibility features included" : "Add ARIA labels",
        color: uxScore >= 70 ? "text-green-400" : uxScore >= 40 ? "text-yellow-400" : "text-red-400"
      },
      {
        id: "scalability",
        name: "Scalability",
        icon: TrendingUp,
        score: scalabilityScore,
        details: hasComponents ? "Modular component structure" : "Consider splitting components",
        color: scalabilityScore >= 70 ? "text-green-400" : scalabilityScore >= 40 ? "text-yellow-400" : "text-red-400"
      }
    ];

    setScores(newScores);

    const overall = Math.round(
      (stabilityScore + securityScore + uxScore + scalabilityScore) / 4
    );
    setOverallScore(overall);

    const ship = overall >= 70 && securityScore >= 60;
    setWouldShip(ship);

    if (overall >= 85) {
      setVerdict("Exceptional. Ship it with confidence.");
    } else if (overall >= 70) {
      setVerdict("I would ship this.");
    } else if (overall >= 50) {
      setVerdict("Needs polish. Address warnings first.");
    } else {
      setVerdict("Not ready yet. Critical issues to fix.");
    }

    setIsScoring(false);

    toast({
      title: "Confidence Score Ready",
      description: `Overall: ${overall}% - ${ship ? "Ready to ship!" : "Needs work"}`
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="bg-black/40 border-violet-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-violet-400" />
          Nemesis Confidence Score™
          {wouldShip !== null && (
            <Badge 
              variant="outline" 
              className={`ml-auto text-xs ${
                wouldShip ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"
              }`}
            >
              {wouldShip ? "Ship Ready" : "Needs Work"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={calculateScores}
          disabled={isScoring || !code}
          className="w-full"
          data-testid="button-calculate-score"
        >
          {isScoring ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Award className="w-4 h-4 mr-2" />
              Calculate Confidence Score
            </>
          )}
        </Button>

        {overallScore !== null && (
          <div className="text-center p-4 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30" data-testid="confidence-result">
            <div className="text-5xl font-bold mb-2" data-testid="text-overall-score">{overallScore}%</div>
            <p className={`text-sm font-medium ${
              wouldShip ? "text-green-400" : "text-yellow-400"
            }`} data-testid="text-verdict">
              {verdict}
            </p>
            {wouldShip && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Rocket className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400 font-medium">Ready for Launch</span>
              </div>
            )}
          </div>
        )}

        {scores.length > 0 && (
          <div className="space-y-3">
            {scores.map((category) => (
              <div key={category.id} className="space-y-1" data-testid={`score-category-${category.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <category.icon className={`w-4 h-4 ${category.color}`} />
                    <span className="text-xs font-medium" data-testid={`text-category-name-${category.id}`}>{category.name}</span>
                  </div>
                  <span className={`text-xs font-bold ${category.color}`} data-testid={`text-category-score-${category.id}`}>
                    {category.score}%
                  </span>
                </div>
                <Progress 
                  value={category.score} 
                  className="h-2"
                  data-testid={`progress-${category.id}`}
                />
                <p className="text-xs text-muted-foreground" data-testid={`text-category-details-${category.id}`}>{category.details}</p>
              </div>
            ))}
          </div>
        )}

        {scores.length === 0 && !isScoring && (
          <div className="text-center py-4">
            <Award className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Generate code to calculate your confidence score
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
