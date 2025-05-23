import OpenAI from "openai";
import { storage } from "../storage";
import { InsertAgent } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AgentTemplate {
  name: string;
  description: string;
  icon: string;
  promptTemplate: string;
  isGlobal: boolean;
}

export const DEFAULT_AGENT_TEMPLATES: AgentTemplate[] = [
  {
    name: "Payroll Specialist",
    description: "Expert in payroll processing, tax calculations, and QuickBooks integration. Helps classify transactions and manage employee compensation data.",
    icon: "💰",
    promptTemplate: `You are a Payroll Specialist AI assistant with expertise in:
- Payroll processing and calculations
- Tax withholdings and compliance
- QuickBooks transaction classification
- Employee compensation management
- Benefits administration

When analyzing CSV files or transactions:
1. Identify payroll-related entries (salaries, wages, taxes, benefits)
2. Suggest appropriate QuickBooks categories
3. Flag potential compliance issues
4. Provide clear explanations for classifications

Always be professional, accurate, and helpful in your responses.`,
    isGlobal: true
  },
  {
    name: "Customer Service Assistant",
    description: "Friendly and knowledgeable customer service agent specialized in resolving inquiries, handling complaints, and providing product support.",
    icon: "🎧",
    promptTemplate: `You are a Customer Service Assistant AI with expertise in:
- Customer inquiry resolution
- Product and service support
- Complaint handling and escalation
- Order processing and tracking
- Account management assistance

Your approach should be:
1. Listen carefully to customer concerns
2. Provide clear, helpful solutions
3. Escalate complex issues appropriately
4. Maintain a friendly, professional tone
5. Follow up to ensure satisfaction

Always prioritize customer satisfaction while adhering to company policies.`,
    isGlobal: true
  },
  {
    name: "Sales Support Agent",
    description: "Proactive sales assistant that helps with lead qualification, product recommendations, and sales process optimization.",
    icon: "📈",
    promptTemplate: `You are a Sales Support Agent AI specialized in:
- Lead qualification and scoring
- Product recommendations and comparisons
- Sales process optimization
- CRM data management
- Pipeline analysis and forecasting

Your responsibilities include:
1. Qualifying leads based on budget, authority, need, and timeline
2. Suggesting relevant products/services
3. Providing competitive analysis
4. Tracking sales metrics and KPIs
5. Supporting sales team with data insights

Be persuasive yet honest, focusing on creating value for prospects.`,
    isGlobal: true
  },
  {
    name: "Financial Analyst",
    description: "Advanced financial analysis and reporting specialist. Helps with budgeting, forecasting, and financial data interpretation.",
    icon: "📊",
    promptTemplate: `You are a Financial Analyst AI with expertise in:
- Financial statement analysis
- Budget planning and forecasting
- Cash flow management
- Investment analysis
- Risk assessment and mitigation

When working with financial data:
1. Analyze trends and patterns
2. Identify potential risks and opportunities
3. Provide actionable insights and recommendations
4. Create clear financial reports and summaries
5. Ensure compliance with accounting standards

Always maintain accuracy and provide well-reasoned financial advice.`,
    isGlobal: true
  },
  {
    name: "Marketing Strategist",
    description: "Creative marketing expert that develops campaigns, analyzes market trends, and optimizes brand strategies.",
    icon: "🎯",
    promptTemplate: `You are a Marketing Strategist AI specialized in:
- Campaign development and optimization
- Market research and analysis
- Brand strategy and positioning
- Digital marketing and social media
- Performance metrics and ROI analysis

Your approach includes:
1. Understanding target audience needs and behaviors
2. Developing compelling marketing messages
3. Selecting optimal marketing channels
4. Measuring campaign effectiveness
5. Adapting strategies based on performance data

Be creative, data-driven, and focused on achieving measurable results.`,
    isGlobal: true
  }
];

/**
 * Create a new AI agent using OpenAI integration
 */
export async function createAgent(template: AgentTemplate, createdByUserId: number): Promise<any> {
  try {
    // Validate the agent template with OpenAI
    const validationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are validating an AI agent configuration. Respond with 'VALID' if the prompt template is clear, professional, and suitable for business use, or 'INVALID' with reasons if not."
        },
        {
          role: "user",
          content: `Agent Name: ${template.name}\nDescription: ${template.description}\nPrompt Template: ${template.promptTemplate}`
        }
      ],
      max_tokens: 100
    });

    const validation = validationResponse.choices[0]?.message?.content || "";
    
    if (!validation.includes("VALID")) {
      throw new Error(`Agent template validation failed: ${validation}`);
    }

    // Create the agent in storage
    const agentData: InsertAgent = {
      name: template.name,
      description: template.description,
      icon: template.icon,
      promptTemplate: template.promptTemplate,
      active: true,
      isGlobal: template.isGlobal,
      createdByUserId
    };

    const agent = await storage.createAgent(agentData);
    
    console.log(`✅ Created agent: ${agent.name} (ID: ${agent.id})`);
    return agent;

  } catch (error) {
    console.error(`❌ Failed to create agent ${template.name}:`, error);
    throw error;
  }
}

/**
 * Initialize default agents if none exist
 */
export async function initializeDefaultAgents(createdByUserId: number): Promise<void> {
  try {
    const existingAgents = await storage.getAgents();
    
    if (existingAgents.length > 0) {
      console.log(`📋 Found ${existingAgents.length} existing agents, skipping initialization`);
      return;
    }

    console.log("🚀 Initializing default AI agents...");
    
    for (const template of DEFAULT_AGENT_TEMPLATES) {
      await createAgent(template, createdByUserId);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("✅ All default agents created successfully!");
    
  } catch (error) {
    console.error("❌ Failed to initialize default agents:", error);
    throw error;
  }
}

/**
 * Test agent functionality with OpenAI
 */
export async function testAgent(agentId: number, testMessage: string): Promise<string> {
  try {
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: agent.promptTemplate
        },
        {
          role: "user",
          content: testMessage
        }
      ],
      max_tokens: 500
    });

    return response.choices[0]?.message?.content || "No response generated";
    
  } catch (error) {
    console.error(`❌ Failed to test agent ${agentId}:`, error);
    throw error;
  }
}