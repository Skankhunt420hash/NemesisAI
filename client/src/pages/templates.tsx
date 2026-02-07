import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Globe,
  Gamepad2,
  Glasses,
  Smartphone,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  Kanban,
  Music,
  Camera,
  Lock,
  ArrowRight,
} from "lucide-react";

const templates = [
  {
    id: "ecommerce",
    title: "E-Commerce Store",
    description: "Full-featured online store with cart, checkout, and product management",
    icon: ShoppingCart,
    type: "Web App",
    tier: "pro",
  },
  {
    id: "chat-app",
    title: "Real-Time Chat",
    description: "WebSocket-powered messaging app with rooms and user presence",
    icon: MessageSquare,
    type: "Web App",
    tier: "pro",
  },
  {
    id: "analytics-dashboard",
    title: "Analytics Dashboard",
    description: "Interactive charts and data visualization with filtering",
    icon: BarChart3,
    type: "Web App",
    tier: "free",
  },
  {
    id: "kanban-board",
    title: "Kanban Board",
    description: "Drag-and-drop project management with task tracking",
    icon: Kanban,
    type: "Web App",
    tier: "free",
  },
  {
    id: "3d-portfolio",
    title: "3D Portfolio",
    description: "Interactive 3D showcase with orbit controls and lighting",
    icon: Gamepad2,
    type: "3D Game",
    tier: "pro",
  },
  {
    id: "vr-gallery",
    title: "VR Art Gallery",
    description: "Immersive virtual reality gallery with room-scale navigation",
    icon: Glasses,
    type: "VR World",
    tier: "pro",
  },
  {
    id: "music-player",
    title: "Music Player",
    description: "Beautiful audio player with playlist management and visualizer",
    icon: Music,
    type: "Web App",
    tier: "free",
  },
  {
    id: "photo-editor",
    title: "Photo Editor",
    description: "Browser-based image editor with filters and adjustments",
    icon: Camera,
    type: "Web App",
    tier: "pro",
  },
  {
    id: "mobile-fitness",
    title: "Fitness Tracker",
    description: "React Native fitness app with workout logging and stats",
    icon: Smartphone,
    type: "Native App",
    tier: "pro",
  },
];

export default function TemplatesPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight" data-testid="text-templates-title">
          Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start from professionally crafted templates. Customize with AI in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="glass-card glass-card-hover group" data-testid={`card-template-${template.id}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center bg-muted/50 border border-border/50">
                    <template.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-heading font-medium" data-testid={`text-template-name-${template.id}`}>
                      {template.title}
                    </p>
                  </div>
                </div>
                {template.tier === "pro" && (
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Pro
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {template.description}
              </p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Badge variant="secondary" className="text-[10px]">{template.type}</Badge>
                <Link href="/create">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid={`button-use-template-${template.id}`}>
                    Use
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
