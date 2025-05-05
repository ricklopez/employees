import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface Agent {
  id: number;
  name: string;
  description: string;
  icon: string;
  promptTemplate: string;
  active: boolean;
}

interface AgentContextType {
  agents: Agent[];
  currentAgent: Agent | null;
  isLoading: boolean;
  error: Error | null;
  setCurrentAgent: (agent: Agent) => void;
}

const AgentContext = createContext<AgentContextType>({
  agents: [],
  currentAgent: null,
  isLoading: false,
  error: null,
  setCurrentAgent: () => {},
});

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);

  const { data: agents, isLoading, error } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  useEffect(() => {
    if (agents && agents.length > 0 && !currentAgent) {
      setCurrentAgent(agents[0]);
    }
  }, [agents, currentAgent]);

  return (
    <AgentContext.Provider
      value={{
        agents: agents || [],
        currentAgent,
        isLoading,
        error: error as Error,
        setCurrentAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export const useAgents = () => useContext(AgentContext);
