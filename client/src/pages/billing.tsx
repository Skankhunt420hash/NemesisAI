import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Check,
  Zap,
  Shield,
  Sparkles,
  Bot,
  Globe,
  Wrench,
} from "lucide-react";

const features = [
  { text: "Unlimited app generation", icon: Sparkles },
  { text: "All 14 AI tools", icon: Wrench },
  { text: "Voice control", icon: Bot },
  { text: "4 app types (Web, 3D, VR, Native)", icon: Globe },
  { text: "Premium templates", icon: Crown },
  { text: "App hardening & security", icon: Shield },
  { text: "Priority support", icon: Zap },
];

export default function BillingPage() {
  const { user } = useAuth();

  const handleSubscribe = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Checkout failed:", data.error || res.statusText);
      }
    } catch (err) {
      console.error("Failed to start checkout:", err);
    }
  };

  const handleManage = async () => {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Portal session failed:", data.error || res.statusText);
      }
    } catch (err) {
      console.error("Failed to open portal:", err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-billing-title">
          Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and payment details.
        </p>
      </div>

      <Card className="glass-card border-primary/10" data-testid="card-current-plan">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20 glow-cyan-subtle">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-heading font-medium" data-testid="text-plan-name">
                  {user?.isPro ? "Pro Plan" : "Free Plan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.isPro ? "$19/month" : "Limited features"}
                </p>
              </div>
            </div>
            {user?.isPro ? (
              <Button variant="outline" size="sm" onClick={handleManage} data-testid="button-manage-billing">
                Manage Subscription
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubscribe} data-testid="button-subscribe">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!user?.isPro && (
        <Card className="glass-card" data-testid="card-pro-features">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              NemesisAI Pro
            </CardTitle>
            <CardDescription>Everything you need to build production apps with AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-heading font-bold">
              $19
              <span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
            <div className="space-y-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3" data-testid={`feature-${i}`}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/10">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" onClick={handleSubscribe} data-testid="button-subscribe-full">
              <Zap className="w-4 h-4 mr-2" />
              Start Pro Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
