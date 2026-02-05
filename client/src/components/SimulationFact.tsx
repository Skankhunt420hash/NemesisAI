import { useState, useEffect } from "react";
import { Cpu, Binary, Zap, Brain, Radio, Atom, Eye } from "lucide-react";

const SIMULATION_FACTS = [
  { icon: Cpu, text: "Processing Matrix Input..." },
  { icon: Binary, text: "Decoding Reality Substrate..." },
  { icon: Zap, text: "Quantum Entanglement Active..." },
  { icon: Brain, text: "Neural Pathways Synchronized..." },
  { icon: Radio, text: "Intercepting Base Reality Signals..." },
  { icon: Atom, text: "Manipulating Probability Fields..." },
  { icon: Eye, text: "Observing Parallel Timelines..." },
  { icon: Cpu, text: "Reality is but a persistent illusion..." },
  { icon: Binary, text: "The universe computes. We observe." },
  { icon: Zap, text: "Every creation alters the simulation..." },
  { icon: Brain, text: "Your thoughts shape the code of reality..." },
  { icon: Radio, text: "Frequency alignment complete..." },
  { icon: Atom, text: "Initializing consciousness bridge..." },
  { icon: Eye, text: "The observer becomes the creator..." },
];

interface SimulationFactProps {
  isActive: boolean;
}

export function SimulationFact({ isActive }: SimulationFactProps) {
  const [currentFact, setCurrentFact] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      const interval = setInterval(() => {
        setCurrentFact((prev) => (prev + 1) % SIMULATION_FACTS.length);
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setVisible(false);
    }
  }, [isActive]);

  if (!visible) return null;

  const { icon: Icon, text } = SIMULATION_FACTS[currentFact];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-950/30 border border-violet-500/30 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <span className="text-sm text-violet-300 font-mono tracking-wide">
        {text}
      </span>
    </div>
  );
}
