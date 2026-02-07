import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Bot,
  TestTube,
  Brain,
  Network,
  Activity,
  Save,
  Shield,
  Heart,
  Users,
  BookOpen,
  Dna,
  DollarSign,
  AlertTriangle,
  Award,
} from "lucide-react";

const tools = [
  {
    id: "god-mode",
    title: "GOD-MODE Agent",
    description: "Autonomous builder that detects and fixes issues without asking",
    icon: Bot,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  {
    id: "live-testing",
    title: "Live Self-Testing",
    description: "Tests the app like a human user would",
    icon: TestTube,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  {
    id: "decision-memory",
    title: "Decision Memory",
    description: "Stores user preferences across sessions",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    id: "visual-brain",
    title: "Visual App Brain",
    description: "Interactive visual map of your app structure",
    icon: Network,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "runtime-awareness",
    title: "Runtime Awareness",
    description: "Real-time monitoring of dev server and build status",
    icon: Activity,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
  },
  {
    id: "file-save-load",
    title: "File Save/Load",
    description: "Save and restore your projects as .nemesis files",
    icon: Save,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  {
    id: "app-hardening",
    title: "App Hardening",
    description: "One-click production-ready security checks",
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    id: "intent-driven",
    title: "Intent-Driven Dev",
    description: "Emotion-first development: 'Make users feel safe'",
    icon: Heart,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
  },
  {
    id: "multi-agent",
    title: "Multi-Agent Swarm",
    description: "5 specialized AI agents working together",
    icon: Users,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
  {
    id: "explain-app",
    title: "Explain My App",
    description: "One-button architecture explanation for handoffs",
    icon: BookOpen,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  {
    id: "app-dna",
    title: "App DNA Export",
    description: "Export and clone your app's architectural DNA",
    icon: Dna,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/20",
  },
  {
    id: "revenue-ai",
    title: "Revenue-Aware AI",
    description: "Monetization suggestions and conversion optimization",
    icon: DollarSign,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  {
    id: "panic-button",
    title: "Panic Button",
    description: "One-click restore to last stable state",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  {
    id: "confidence-score",
    title: "Confidence Score",
    description: "Ship-readiness scoring across stability, security, UX",
    icon: Award,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
  },
];

export default function ToolsPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-tools-title">
          AI Tools
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          14 enterprise-grade AI tools to supercharge your development workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link key={tool.id} href="/create">
            <Card className="glass-card glass-card-hover cursor-pointer group h-full" data-testid={`card-tool-${tool.id}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${tool.bgColor} border ${tool.borderColor}`}>
                    <tool.icon className={`w-4 h-4 ${tool.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading font-medium truncate" data-testid={`text-tool-name-${tool.id}`}>
                      {tool.title}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`text-tool-desc-${tool.id}`}>
                  {tool.description}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  Available in Create
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
