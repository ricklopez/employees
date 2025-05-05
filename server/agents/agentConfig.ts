import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Define the agent configuration schema
const agentConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  promptTemplate: z.string(),
  active: z.boolean().optional().default(true)
});

type AgentConfig = z.infer<typeof agentConfigSchema>;

/**
 * Load all agents from the JSON configuration file
 */
export function loadAgents(): AgentConfig[] {
  try {
    const agentFilePath = path.join(process.cwd(), 'server/agents/agents.json');
    
    if (!fs.existsSync(agentFilePath)) {
      console.warn('Agent configuration file not found. Creating default agent.');
      
      // Create default agent if file doesn't exist
      const defaultAgent: AgentConfig = {
        name: "Payroll Agent",
        description: "Classifies transactions for QuickBooks",
        icon: "money-dollar-circle",
        promptTemplate: "You are a payroll transaction classifier. Analyze these transactions and categorize them for QuickBooks.",
        active: true
      };
      
      saveAgents([defaultAgent]);
      return [defaultAgent];
    }
    
    const agentsData = JSON.parse(fs.readFileSync(agentFilePath, 'utf8'));
    
    // Validate agents against the schema
    const agents: AgentConfig[] = [];
    for (const agentData of agentsData) {
      try {
        const validAgent = agentConfigSchema.parse(agentData);
        agents.push(validAgent);
      } catch (err) {
        console.error('Invalid agent configuration:', err);
      }
    }
    
    return agents;
  } catch (error) {
    console.error('Error loading agents:', error);
    return [];
  }
}

/**
 * Save agents to the JSON configuration file
 */
export function saveAgents(agents: AgentConfig[]): void {
  try {
    const agentFilePath = path.join(process.cwd(), 'server/agents/agents.json');
    fs.writeFileSync(agentFilePath, JSON.stringify(agents, null, 2));
  } catch (error) {
    console.error('Error saving agents:', error);
  }
}

/**
 * Add a new agent to the configuration
 */
export function addAgent(agent: AgentConfig): AgentConfig[] {
  const agents = loadAgents();
  agents.push(agent);
  saveAgents(agents);
  return agents;
}

/**
 * Update an existing agent
 */
export function updateAgent(name: string, updatedAgent: Partial<AgentConfig>): AgentConfig[] {
  const agents = loadAgents();
  const updatedAgents = agents.map(agent => 
    agent.name === name ? { ...agent, ...updatedAgent } : agent
  );
  saveAgents(updatedAgents);
  return updatedAgents;
}
