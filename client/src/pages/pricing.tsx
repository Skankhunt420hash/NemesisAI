import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Check, Crown, Loader2 } from "lucide-react";

export default function PricingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      setLocation("/register");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Checkout failed");

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Unlimited app generation",
    "Voice-controlled development",
    "Live preview & instant deploy",
    "Web apps, 3D games & native apps",
    "Incremental AI updates",
    "React Native export packages",
    "Priority support",
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b gold-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-4">
              <Link href={user ? "/forge" : "/"}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <span className="text-lg font-semibold">NemesisAI</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-primary text-primary mb-4">
            <Crown className="w-3 h-3 mr-1" />
            Pro Plan
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Unlock the Full Power of NemesisAI
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get unlimited access to our AI-powered app generation and take your development to the next level.
          </p>
        </div>

        <Card className="border gold-line violet-glow max-w-lg mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Pro Subscription</CardTitle>
            <CardDescription>Everything you need to build amazing apps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-primary">$19</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {user?.isPro ? (
              <div className="text-center py-4">
                <Badge variant="outline" className="border-primary text-primary">
                  <Check className="w-3 h-3 mr-1" />
                  You're already a Pro member
                </Badge>
              </div>
            ) : (
              <Button 
                onClick={handleSubscribe} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
                data-testid="button-subscribe"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    {user ? "Subscribe Now" : "Get Started"}
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime. No questions asked.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
