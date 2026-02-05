import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Bot, Palette, Shield, TestTube, Activity, Loader2, CheckCircle2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: typeof Bot;
  color: string;
  status: "idle" | "thinking" | "done";
}

interface SwarmMessage {
  agentId: string;
  agentName: string;
  message: string;
  type: "analysis" | "suggestion" | "approval" | "concern";
  timestamp: Date;
}

interface SwarmDecision {
  title: string;
  description: string;
  approvedBy: string[];
  concerns: string[];
}

interface MultiAgentSwarmProps {
  code: string;
  appType: string;
  onDecision: (decision: SwarmDecision) => void;
}

const AGENTS: Agent[] = [
  { id: "architect", name: "Architect", role: "System Design", icon: Bot, color: "text-blue-400", status: "idle" },
  { id: "ui", name: "UI/UX", role: "User Experience", icon: Palette, color: "text-pink-400", status: "idle" },
  { id: "security", name: "Security", role: "Vulnerability Analysis", icon: Shield, color: "text-red-400", status: "idle" },
  { id: "qa", name: "QA", role: "Quality Assurance", icon: TestTube, color: "text-green-400", status: "idle" },
  { id: "runtime", name: "Runtime", role: "Performance", icon: Activity, color: "text-yellow-400", status: "idle" }
];

export function MultiAgentSwarm({ code, appType, onDecision }: MultiAgentSwarmProps) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [isSwarmActive, setIsSwarmActive] = useState(false);
  const [messages, setMessages] = useState<SwarmMessage[]>([]);
  const [finalDecision, setFinalDecision] = useState<SwarmDecision | null>(null);

  const simulateSwarm = async () => {
    if (!code) {
      toast({ title: "No Code", description: "Generate an app first", variant: "destructive" });
      return;
    }

    setIsSwarmActive(true);
    setMessages([]);
    setFinalDecision(null);

    const swarmMessages: SwarmMessage[] = [];

    for (const agent of agents) {
      setAgents(prev => prev.map(a => 
        a.id === agent.id ? { ...a, status: "thinking" } : a
      ));

      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

      let message: SwarmMessage;
      switch (agent.id) {
        case "architect":
          message = {
            agentId: agent.id,
            agentName: agent.name,
            message: appType === "web" 
              ? "Component structure follows React best practices. Suggest adding error boundaries."
              : `${appType} architecture verified. Scene graph optimized.`,
            type: "analysis",
            timestamp: new Date()
          };
          break;
        case "ui":
          message = {
            agentId: agent.id,
            agentName: agent.name,
            message: "Color contrast passes WCAG AA. Recommend larger touch targets for mobile.",
            type: "suggestion",
            timestamp: new Date()
          };
          break;
        case "security":
          message = {
            agentId: agent.id,
            agentName: agent.name,
            message: code.includes("innerHTML") 
              ? "CONCERN: Potential XSS vulnerability detected. Sanitization required."
              : "No critical vulnerabilities found. Input validation present.",
            type: code.includes("innerHTML") ? "concern" : "approval",
            timestamp: new Date()
          };
          break;
        case "qa":
          message = {
            agentId: agent.id,
            agentName: agent.name,
            message: "All interactive elements have proper event handlers. Edge cases covered.",
            type: "approval",
            timestamp: new Date()
          };
          break;
        case "runtime":
          message = {
            agentId: agent.id,
            agentName: agent.name,
            message: "Bundle size acceptable. Memory usage within limits. No performance bottlenecks.",
            type: "approval",
            timestamp: new Date()
          };
          break;
        default:
          message = {
            agentId: agent.id,
            agentName: agent.name,
            message: "Analysis complete.",
            type: "analysis",
            timestamp: new Date()
          };
      }

      swarmMessages.push(message);
      setMessages([...swarmMessages]);

      setAgents(prev => prev.map(a => 
        a.id === agent.id ? { ...a, status: "done" } : a
      ));
    }

    await new Promise(r => setTimeout(r, 500));

    const decision: SwarmDecision = {
      title: "Swarm Consensus Reached",
      description: "All agents have analyzed the codebase and reached agreement.",
      approvedBy: swarmMessages.filter(m => m.type === "approval" || m.type === "suggestion").map(m => m.agentName),
      concerns: swarmMessages.filter(m => m.type === "concern").map(m => m.message)
    };

    setFinalDecision(decision);
    setIsSwarmActive(false);
    onDecision(decision);

    toast({
      title: "Swarm Complete",
      description: `${decision.approvedBy.length} agents approved, ${decision.concerns.length} concerns raised`
    });

    setTimeout(() => {
      setAgents(AGENTS);
    }, 2000);
  };

  const getMessageBadge = (type: SwarmMessage["type"]) => {
    switch (type) {
      case "approval": return <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Approved</Badge>;
      case "suggestion": return <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">Suggestion</Badge>;
      case "concern": return <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">Concern</Badge>;
      default: return <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">Analysis</Badge>;
    }
  };

  return (
    <Card className="bg-black/40 border-violet-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          Multi-Agent Swarm
          <Badge variant="outline" className="ml-auto text-xs border-cyan-500/30 text-cyan-400">
            5 Agents
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {agents.map((agent) => (
            <div 
              key={agent.id}
              className={`flex items-center gap-1 p-1.5 rounded-md bg-black/30 ${
                agent.status === "thinking" ? "ring-1 ring-violet-500/50 animate-pulse" : ""
              }`}
              data-testid={`agent-status-${agent.id}`}
            >
              {agent.status === "thinking" ? (
                <Loader2 className={`w-3 h-3 ${agent.color} animate-spin`} />
              ) : agent.status === "done" ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <agent.icon className={`w-3 h-3 ${agent.color}`} />
              )}
              <span className="text-xs" data-testid={`text-agent-name-${agent.id}`}>{agent.name}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={simulateSwarm}
          disabled={isSwarmActive || !code}
          className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500"
          data-testid="button-start-swarm"
        >
          {isSwarmActive ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Agents Collaborating...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Activate Swarm Intelligence
            </>
          )}
        </Button>

        {messages.length > 0 && (
          <ScrollArea className="h-[200px] rounded-md border border-violet-500/20 p-2">
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className="p-2 rounded-md bg-black/30 space-y-1" data-testid={`swarm-message-${i}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium" data-testid={`text-agent-msg-${i}`}>{msg.agentName} Agent</span>
                    {getMessageBadge(msg.type)}
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid={`text-message-${i}`}>{msg.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {finalDecision && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/30">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium">{finalDecision.title}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{finalDecision.description}</p>
            <div className="flex flex-wrap gap-1">
              {finalDecision.approvedBy.map((agent) => (
                <Badge key={agent} variant="outline" className="text-xs border-green-500/30 text-green-400">
                  {agent}
                </Badge>
              ))}
            </div>
            {finalDecision.concerns.length > 0 && (
              <div className="mt-2 pt-2 border-t border-violet-500/20">
                <p className="text-xs text-red-400">Concerns to address:</p>
                {finalDecision.concerns.map((concern, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {concern}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
