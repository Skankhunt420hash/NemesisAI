import { useState, useEffect } from "react";
import { Cpu, Binary, Zap, Brain, Radio, Atom, Eye } from "lucide-react";

const SIMULATION_FACTS = [
  { icon: Cpu, text: "Nick Bostrom: If civilizations create simulations, we're likely in one." },
  { icon: Binary, text: "Max Tegmark: Reality is purely mathematical in nature." },
  { icon: Zap, text: "Quantum mechanics: Particles exist as probabilities until observed." },
  { icon: Brain, text: "The brain processes 11 million bits per second. We're aware of 50." },
  { icon: Radio, text: "Planck length: Reality may have a minimum resolution of 10^-35 meters." },
  { icon: Atom, text: "99.9999999% of atoms are empty space. Solidity is an illusion." },
  { icon: Eye, text: "The observer effect: Consciousness shapes quantum outcomes." },
  { icon: Cpu, text: "John Wheeler: Information is the foundation of physical reality." },
  { icon: Binary, text: "The universe appears fine-tuned. Constants off by 1% = no life." },
  { icon: Zap, text: "Quantum entanglement: Particles communicate instantly across space." },
  { icon: Brain, text: "Elon Musk: Odds we're in base reality is one in billions." },
  { icon: Radio, text: "The holographic principle: 3D reality encoded on a 2D surface." },
  { icon: Atom, text: "Time may not exist at the quantum level. Only change exists." },
  { icon: Eye, text: "Conway's Game of Life: Complex patterns from simple rules." },
  { icon: Cpu, text: "The universe computes. Every interaction is a calculation." },
  { icon: Binary, text: "Digital physics: Space-time may be discrete, not continuous." },
  { icon: Zap, text: "The measurement problem: Reality is undefined until measured." },
  { icon: Brain, text: "Your neural network creates reality from electrical signals." },
  { icon: Radio, text: "The cosmic microwave background may contain computational patterns." },
  { icon: Atom, text: "Vacuum energy: Empty space contains infinite potential." },
  { icon: Eye, text: "We create what we observe. Observation is creation." },
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
