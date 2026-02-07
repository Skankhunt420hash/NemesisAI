import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ReadyState {
  isReady: boolean;
  isChecking: boolean;
  version: string;
  errors: string[];
  checks: {
    database: string;
    environment: Record<string, boolean>;
  } | null;
  refetch: () => Promise<void>;
}

const ReadyContext = createContext<ReadyState | null>(null);

export function ReadyProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [version, setVersion] = useState("...");
  const [errors, setErrors] = useState<string[]>([]);
  const [checks, setChecks] = useState<ReadyState["checks"]>(null);

  const fetchReady = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/ready");
      const data = await res.json();
      setIsReady(data.status === "ready");
      setVersion(data.version || "unknown");
      setErrors(data.errors || []);
      setChecks(data.checks || null);
    } catch {
      setIsReady(false);
      setVersion("offline");
      setErrors(["Cannot reach server"]);
      setChecks(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchReady();
    const interval = setInterval(fetchReady, 30000);
    return () => clearInterval(interval);
  }, [fetchReady]);

  return (
    <ReadyContext.Provider value={{ isReady, isChecking, version, errors, checks, refetch: fetchReady }}>
      {children}
    </ReadyContext.Provider>
  );
}

export function useReady() {
  const context = useContext(ReadyContext);
  if (!context) {
    throw new Error("useReady must be used within a ReadyProvider");
  }
  return context;
}
