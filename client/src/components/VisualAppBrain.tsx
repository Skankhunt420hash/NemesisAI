import { useState, useCallback, useMemo } from "react";
import { Network, Box, Database, Zap, Link2, Eye, EyeOff, ZoomIn, ZoomOut, Maximize2, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppNode {
  id: string;
  type: "component" | "state" | "api" | "page" | "dependency";
  name: string;
  connections: string[];
  details?: string;
  x: number;
  y: number;
}

interface VisualAppBrainProps {
  code: string;
  appType: string;
  onNodeClick?: (node: AppNode) => void;
}

const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  component: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-300" },
  state: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-300" },
  api: { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-300" },
  page: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-300" },
  dependency: { bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-300" },
};

const nodeIcons: Record<string, React.ReactNode> = {
  component: <Box className="w-3 h-3" />,
  state: <Database className="w-3 h-3" />,
  api: <Zap className="w-3 h-3" />,
  page: <Network className="w-3 h-3" />,
  dependency: <Link2 className="w-3 h-3" />,
};

export function VisualAppBrain({ code, appType, onNodeClick }: VisualAppBrainProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<AppNode["type"] | "all">("all");

  const nodes = useMemo(() => {
    const discovered: AppNode[] = [];
    let nodeIndex = 0;
    
    const componentMatches = code.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*(?:=|:|\()/g) || [];
    componentMatches.forEach((match) => {
      const name = match.match(/([A-Z][a-zA-Z0-9]*)/)?.[1];
      if (name && !discovered.find(n => n.name === name)) {
        discovered.push({
          id: `comp-${nodeIndex}`,
          type: "component",
          name,
          connections: [],
          x: 50 + (nodeIndex % 3) * 120,
          y: 50 + Math.floor(nodeIndex / 3) * 80,
        });
        nodeIndex++;
      }
    });
    
    const stateMatches = code.match(/useState\s*<?\s*\w*\s*>?\s*\(\s*[^)]*\)/g) || [];
    stateMatches.forEach((match, i) => {
      discovered.push({
        id: `state-${i}`,
        type: "state",
        name: `State ${i + 1}`,
        connections: [],
        details: match.slice(0, 50),
        x: 400 + (i % 2) * 100,
        y: 50 + Math.floor(i / 2) * 60,
      });
    });
    
    const apiMatches = code.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
    apiMatches.forEach((match, i) => {
      const url = match.match(/['"`]([^'"`]+)['"`]/)?.[1] || "API";
      discovered.push({
        id: `api-${i}`,
        type: "api",
        name: url.length > 20 ? url.slice(0, 20) + "..." : url,
        connections: [],
        details: url,
        x: 50 + (i % 2) * 150,
        y: 250 + Math.floor(i / 2) * 60,
      });
    });
    
    const routeMatches = code.match(/(?:Route|Link|href)\s*(?:path|to|=)\s*['"`]([^'"`]+)['"`]/g) || [];
    const uniqueRoutes = new Set<string>();
    routeMatches.forEach((match) => {
      const route = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
      if (route && !uniqueRoutes.has(route)) {
        uniqueRoutes.add(route);
      }
    });
    
    Array.from(uniqueRoutes).forEach((route, i) => {
      discovered.push({
        id: `page-${i}`,
        type: "page",
        name: route,
        connections: [],
        x: 300 + (i % 2) * 100,
        y: 180 + Math.floor(i / 2) * 50,
      });
    });
    
    const importMatches = code.match(/from\s+['"]([^'"]+)['"]/g) || [];
    const uniqueDeps = new Set<string>();
    importMatches.forEach((match) => {
      const dep = match.match(/['"]([^'"]+)['"]/)?.[1];
      if (dep && !dep.startsWith('.') && !dep.startsWith('@/')) {
        const depName = dep.split('/')[0].replace('@', '');
        uniqueDeps.add(depName);
      }
    });
    
    Array.from(uniqueDeps).slice(0, 6).forEach((dep, i) => {
      discovered.push({
        id: `dep-${i}`,
        type: "dependency",
        name: dep,
        connections: [],
        x: 450 + (i % 2) * 80,
        y: 250 + Math.floor(i / 2) * 40,
      });
    });
    
    discovered.forEach((node, i) => {
      if (node.type === "component") {
        const states = discovered.filter(n => n.type === "state");
        if (states.length > 0) {
          node.connections.push(states[i % states.length].id);
        }
      }
      if (node.type === "page") {
        const components = discovered.filter(n => n.type === "component");
        if (components.length > 0) {
          node.connections.push(components[0].id);
        }
      }
    });
    
    return discovered;
  }, [code]);

  const filteredNodes = filter === "all" ? nodes : nodes.filter(n => n.type === filter);

  const handleNodeClick = (node: AppNode) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);
    onNodeClick?.(node);
  };

  const typeCounts = useMemo(() => {
    return nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [nodes]);

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-lg border border-purple-500/20">
      <div className="flex items-center justify-between p-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-gold">VISUAL APP BRAIN</span>
          <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
            {nodes.length} nodes
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowConnections(!showConnections)}
            className="h-7 w-7 p-0"
            data-testid="button-toggle-connections"
          >
            {showConnections ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="h-7 w-7 p-0"
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
            className="h-7 w-7 p-0"
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-500/10 overflow-x-auto">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "ghost"}
          onClick={() => setFilter("all")}
          className="h-6 text-xs"
          data-testid="filter-all"
        >
          All ({nodes.length})
        </Button>
        {Object.entries(typeCounts).map(([type, count]) => (
          <Button
            key={type}
            size="sm"
            variant={filter === type ? "default" : "ghost"}
            onClick={() => setFilter(type as AppNode["type"])}
            className={`h-6 text-xs ${filter === type ? "" : nodeColors[type]?.text}`}
            data-testid={`filter-${type}`}
          >
            {nodeIcons[type]}
            <span className="ml-1">{type} ({count})</span>
          </Button>
        ))}
      </div>

      <div className="flex-1 relative overflow-hidden bg-black/20">
        <div 
          className="absolute inset-0 p-4"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {showConnections && filteredNodes.map((node) => (
            node.connections.map((targetId) => {
              const target = nodes.find(n => n.id === targetId);
              if (!target || !filteredNodes.includes(target)) return null;
              
              return (
                <svg
                  key={`${node.id}-${targetId}`}
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                >
                  <line
                    x1={node.x + 40}
                    y1={node.y + 15}
                    x2={target.x + 40}
                    y2={target.y + 15}
                    stroke="rgba(168, 85, 247, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="4"
                  />
                </svg>
              );
            })
          ))}
          
          {filteredNodes.map((node) => {
            const colors = nodeColors[node.type];
            const isSelected = selectedNode === node.id;
            
            return (
              <div
                key={node.id}
                className={`absolute cursor-pointer transition-all duration-200 ${colors.bg} ${colors.border} border rounded-lg p-2 min-w-[80px] ${
                  isSelected ? 'ring-2 ring-gold shadow-lg shadow-gold/20' : 'hover:scale-105'
                }`}
                style={{ left: node.x, top: node.y }}
                onClick={() => handleNodeClick(node)}
                data-testid={`node-${node.id}`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className={colors.text}>{nodeIcons[node.type]}</span>
                  <span className={`text-xs font-medium ${colors.text}`}>{node.type}</span>
                </div>
                <p className="text-xs text-foreground truncate max-w-[100px]">{node.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {selectedNode && (
        <div className="p-3 border-t border-purple-500/20 bg-black/30">
          {(() => {
            const node = nodes.find(n => n.id === selectedNode);
            if (!node) return null;
            const colors = nodeColors[node.type];
            
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={colors.text}>{nodeIcons[node.type]}</span>
                    <span className="text-sm font-medium">{node.name}</span>
                    <Badge variant="outline" className={`text-xs ${colors.border} ${colors.text}`}>
                      {node.type}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6" data-testid="button-edit-node">
                    <Code className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
                {node.details && (
                  <p className="text-xs text-muted-foreground font-mono bg-black/30 p-2 rounded">
                    {node.details}
                  </p>
                )}
                {node.connections.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Connected to:</span>
                    {node.connections.map((connId) => {
                      const conn = nodes.find(n => n.id === connId);
                      return conn ? (
                        <Badge key={connId} variant="outline" className="text-xs">
                          {conn.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
