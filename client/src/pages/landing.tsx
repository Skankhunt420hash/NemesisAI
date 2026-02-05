import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, Code, Zap, Shield, ArrowRight, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b gold-line bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <span className="text-lg font-semibold tracking-tight">NemesisAI - Creator App</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="link-login">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="link-register">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border gold-line bg-card/50 backdrop-blur mb-8">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Powered by Advanced AI</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="text-foreground">NemesisAI</span>
                <br />
                <span className="text-gold">Creator App</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
                Everything is possible if you want it.
              </p>
              
              <p className="text-base text-muted-foreground/80 max-w-xl mx-auto mb-10">
                Transform your ideas into fully functional applications. 
                Simply describe what you want, and let NemesisAI generate the code for you.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="text-base px-8" data-testid="button-start-creating">
                    Start Creating
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="text-base px-8" data-testid="button-sign-in">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t gold-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why NemesisAI?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Experience the future of app development with our cutting-edge AI technology.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Code className="w-6 h-6" />}
                title="AI-Powered Generation"
                description="Describe your app in natural language and watch as our AI creates production-ready code instantly."
              />
              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Lightning Fast"
                description="Generate complete applications in seconds, not hours. Speed up your development workflow dramatically."
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Enterprise Quality"
                description="Get clean, maintainable code that follows best practices and modern development standards."
              />
            </div>
          </div>
        </section>

        <section className="py-20 border-t gold-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-lg border gold-line bg-card p-8 sm:p-12 violet-glow-subtle overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/10" />
              <div className="relative text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Build Something Amazing?</h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  Join thousands of developers who are creating apps faster than ever with NemesisAI.
                </p>
                <Link href="/register">
                  <Button size="lg" className="px-8" data-testid="button-get-started-free">
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t gold-line py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded gold-gradient flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="text-sm font-medium">NemesisAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} NemesisAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative p-6 rounded-lg border gold-line bg-card violet-glow-subtle">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
