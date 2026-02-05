import { useState, useEffect } from "react";
import { Brain, Save, Trash2, Plus, Check, X, Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export interface UserPreference {
  id: string;
  category: "framework" | "styling" | "architecture" | "workflow" | "custom";
  key: string;
  value: string;
  learnedFrom?: string;
  createdAt: Date;
  usageCount: number;
}

interface DecisionMemoryProps {
  userId?: number;
  onPreferenceApply?: (preferences: UserPreference[]) => void;
}

const defaultPreferences: Omit<UserPreference, "id" | "createdAt" | "usageCount">[] = [
  { category: "framework", key: "Frontend Framework", value: "React + TypeScript", learnedFrom: "Default" },
  { category: "styling", key: "CSS Framework", value: "Tailwind CSS", learnedFrom: "Default" },
  { category: "styling", key: "Component Library", value: "shadcn/ui", learnedFrom: "Default" },
  { category: "architecture", key: "State Management", value: "React Query + Context", learnedFrom: "Default" },
  { category: "workflow", key: "Build Tool", value: "Vite", learnedFrom: "Default" },
];

const categoryColors: Record<string, string> = {
  framework: "border-blue-500/50 text-blue-300",
  styling: "border-pink-500/50 text-pink-300",
  architecture: "border-green-500/50 text-green-300",
  workflow: "border-yellow-500/50 text-yellow-300",
  custom: "border-purple-500/50 text-purple-300",
};

const categoryIcons: Record<string, string> = {
  framework: "🏗️",
  styling: "🎨",
  architecture: "📐",
  workflow: "⚙️",
  custom: "✨",
};

export function DecisionMemory({ userId, onPreferenceApply }: DecisionMemoryProps) {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<UserPreference["category"]>("custom");
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(`nemesis-preferences-${userId || 'guest'}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(parsed.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })));
      } catch (e) {
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  }, [userId]);

  const initializeDefaults = () => {
    const defaults: UserPreference[] = defaultPreferences.map((p, i) => ({
      ...p,
      id: `pref-${i}`,
      createdAt: new Date(),
      usageCount: 0,
    }));
    setPreferences(defaults);
    savePreferences(defaults);
  };

  const savePreferences = (prefs: UserPreference[]) => {
    localStorage.setItem(`nemesis-preferences-${userId || 'guest'}`, JSON.stringify(prefs));
  };

  const addPreference = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    
    const newPref: UserPreference = {
      id: `pref-${Date.now()}`,
      category: newCategory,
      key: newKey.trim(),
      value: newValue.trim(),
      learnedFrom: "User defined",
      createdAt: new Date(),
      usageCount: 0,
    };
    
    const updated = [...preferences, newPref];
    setPreferences(updated);
    savePreferences(updated);
    
    setNewKey("");
    setNewValue("");
    setIsAdding(false);
    
    toast({
      title: "Preference saved",
      description: `I'll remember: ${newKey} = ${newValue}`,
    });
  };

  const removePreference = (id: string) => {
    const updated = preferences.filter(p => p.id !== id);
    setPreferences(updated);
    savePreferences(updated);
    
    toast({
      title: "Preference removed",
      description: "I've forgotten this preference",
    });
  };

  const incrementUsage = (id: string) => {
    const updated = preferences.map(p => 
      p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p
    );
    setPreferences(updated);
    savePreferences(updated);
  };

  const applyPreferences = () => {
    onPreferenceApply?.(preferences);
    preferences.forEach(p => incrementUsage(p.id));
    
    toast({
      title: "Preferences applied",
      description: `Applied ${preferences.length} preferences to your new project`,
    });
  };

  const learnFromCode = (code: string) => {
    const learned: Omit<UserPreference, "id" | "createdAt" | "usageCount">[] = [];
    
    if (code.includes('zustand')) {
      learned.push({ category: "architecture", key: "State Management", value: "Zustand", learnedFrom: "Code analysis" });
    }
    if (code.includes('framer-motion')) {
      learned.push({ category: "styling", key: "Animations", value: "Framer Motion", learnedFrom: "Code analysis" });
    }
    if (code.includes('three') || code.includes('Three')) {
      learned.push({ category: "framework", key: "3D Library", value: "Three.js", learnedFrom: "Code analysis" });
    }
    if (code.includes('next/')) {
      learned.push({ category: "framework", key: "Framework", value: "Next.js", learnedFrom: "Code analysis" });
    }
    
    if (learned.length > 0) {
      const newPrefs: UserPreference[] = learned.map((l, i) => ({
        ...l,
        id: `learned-${Date.now()}-${i}`,
        createdAt: new Date(),
        usageCount: 1,
      }));
      
      const existingKeys = new Set(preferences.map(p => p.key));
      const uniqueNew = newPrefs.filter(p => !existingKeys.has(p.key));
      
      if (uniqueNew.length > 0) {
        const updated = [...preferences, ...uniqueNew];
        setPreferences(updated);
        savePreferences(updated);
        
        toast({
          title: "Learned new preferences",
          description: `Discovered ${uniqueNew.length} new pattern(s) from your code`,
        });
      }
    }
  };

  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) acc[pref.category] = [];
    acc[pref.category].push(pref);
    return acc;
  }, {} as Record<string, UserPreference[]>);

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-lg border border-purple-500/20">
      <div className="flex items-center justify-between p-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-gold">DECISION MEMORY</span>
          <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
            {preferences.length} preferences
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(!isAdding)}
            className="h-7"
            data-testid="button-add-preference"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
          <Button
            size="sm"
            onClick={applyPreferences}
            className="h-7 bg-gold hover:bg-gold/90 text-black"
            data-testid="button-apply-preferences"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Apply
          </Button>
        </div>
      </div>

      {isAdding && (
        <div className="p-3 border-b border-purple-500/10 space-y-2">
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as UserPreference["category"])}
              className="h-8 px-2 text-xs bg-black/50 border border-purple-500/30 rounded"
              data-testid="select-category"
            >
              <option value="framework">Framework</option>
              <option value="styling">Styling</option>
              <option value="architecture">Architecture</option>
              <option value="workflow">Workflow</option>
              <option value="custom">Custom</option>
            </select>
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Preference name..."
              className="h-8 text-xs flex-1"
              data-testid="input-preference-key"
            />
          </div>
          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Preference value..."
              className="h-8 text-xs flex-1"
              data-testid="input-preference-value"
            />
            <Button size="sm" variant="ghost" className="h-8" onClick={addPreference} data-testid="button-save-preference">
              <Check className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsAdding(false)} data-testid="button-cancel-add">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-2">
        {Object.entries(groupedPreferences).map(([category, prefs]) => (
          <div key={category} className="mb-3">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-sm">{categoryIcons[category]}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {category}
              </span>
            </div>
            <div className="space-y-1">
              {prefs.map((pref) => (
                <div
                  key={pref.id}
                  className="flex items-center justify-between p-2 rounded bg-black/30 border border-purple-500/10 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{pref.key}</span>
                      <Badge variant="outline" className={`text-xs ${categoryColors[pref.category]}`}>
                        {pref.value}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground/60">
                        {pref.learnedFrom}
                      </span>
                      {pref.usageCount > 0 && (
                        <span className="text-xs text-gold/60">
                          Used {pref.usageCount}x
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePreference(pref.id)}
                    data-testid={`button-remove-${pref.id}`}
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      <div className="p-2 border-t border-purple-500/10">
        <p className="text-xs text-muted-foreground text-center">
          After 3+ projects, I'll feel like your personal CTO
        </p>
      </div>
    </div>
  );
}
