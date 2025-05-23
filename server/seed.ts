import { storage } from "./storage";
import { loadAgents } from "./agents/agentConfig";

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database with initial data...");
    
    // Load agents from the JSON configuration
    const agentConfigs = loadAgents();
    
    // Create global agents from the configuration
    for (const agentConfig of agentConfigs) {
      try {
        const existingAgent = await storage.getAgents();
        const agentExists = existingAgent.some(a => a.name === agentConfig.name);
        
        if (!agentExists) {
          await storage.createAgent({
            name: agentConfig.name,
            description: agentConfig.description,
            icon: agentConfig.icon,
            promptTemplate: agentConfig.promptTemplate,
            active: agentConfig.active,
            isGlobal: true, // Make these global agents available to all companies
            createdByUserId: 1, // Assign to the first admin user
          });
          console.log(`✅ Created global agent: ${agentConfig.name}`);
        }
      } catch (error) {
        console.log(`⚠️ Skipping agent ${agentConfig.name}: ${error.message}`);
      }
    }
    
    console.log("🎉 Database seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}