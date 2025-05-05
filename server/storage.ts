import { 
  users, 
  agents, 
  conversations, 
  messages, 
  transactions,
  type User, 
  type InsertUser, 
  type Agent, 
  type InsertAgent,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Transaction,
  type InsertTransaction
} from "@shared/schema";
import fs from 'fs';
import path from 'path';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Agent methods
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  
  // Conversation methods
  getConversations(userId?: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // Message methods
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Transaction methods
  getTransactions(conversationId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  createTransactions(transactions: InsertTransaction[]): Promise<Transaction[]>;
  getTransactionSummary(conversationId: number): Promise<{ category: string; total: number; count: number; }[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private agents: Map<number, Agent>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private transactions: Map<number, Transaction>;
  
  private userId: number = 1;
  private agentId: number = 1;
  private conversationId: number = 1;
  private messageId: number = 1;
  private transactionId: number = 1;

  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.transactions = new Map();
    
    // Load predefined agents from JSON file
    this.loadAgentsFromJson();
  }

  // Load agents from JSON file
  private async loadAgentsFromJson() {
    try {
      const agentsPath = path.join(process.cwd(), 'server/agents/agents.json');
      if (fs.existsSync(agentsPath)) {
        const agentsData = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
        
        for (const agentData of agentsData) {
          const agent: InsertAgent = {
            name: agentData.name,
            description: agentData.description,
            icon: agentData.icon,
            promptTemplate: agentData.promptTemplate,
            active: agentData.active !== false // Default to true if not specified
          };
          this.createAgent(agent);
        }
      }
    } catch (error) {
      console.error('Error loading agents from JSON:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(agent => agent.active);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.agentId++;
    const agent: Agent = { ...insertAgent, id };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(id: number, agentUpdate: Partial<InsertAgent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent: Agent = { ...agent, ...agentUpdate };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  // Conversation methods
  async getConversations(userId?: number): Promise<Conversation[]> {
    let conversations = Array.from(this.conversations.values());
    if (userId) {
      conversations = conversations.filter(conv => conv.userId === userId);
    }
    return conversations;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationId++;
    const createdAt = new Date();
    const conversation: Conversation = { ...insertConversation, id, createdAt };
    this.conversations.set(id, conversation);
    return conversation;
  }

  // Message methods
  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const createdAt = new Date();
    const message: Message = { ...insertMessage, id, createdAt };
    this.messages.set(id, message);
    return message;
  }

  // Transaction methods
  async getTransactions(conversationId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.conversationId === conversationId);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    const createdAt = new Date();
    const transaction: Transaction = { ...insertTransaction, id, createdAt };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async createTransactions(insertTransactions: InsertTransaction[]): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    
    for (const insertTransaction of insertTransactions) {
      const transaction = await this.createTransaction(insertTransaction);
      transactions.push(transaction);
    }
    
    return transactions;
  }

  async getTransactionSummary(conversationId: number): Promise<{ category: string; total: number; count: number; }[]> {
    const transactions = await this.getTransactions(conversationId);
    
    const summaryMap = new Map<string, { total: number, count: number }>();
    
    for (const transaction of transactions) {
      const category = transaction.category;
      const amount = parseFloat(transaction.amount.replace(/[^0-9.-]+/g, ""));
      
      if (!isNaN(amount)) {
        if (!summaryMap.has(category)) {
          summaryMap.set(category, { total: 0, count: 0 });
        }
        
        const summary = summaryMap.get(category)!;
        summary.total += amount;
        summary.count += 1;
        summaryMap.set(category, summary);
      }
    }
    
    return Array.from(summaryMap.entries()).map(([category, { total, count }]) => ({
      category,
      total: parseFloat(total.toFixed(2)),
      count
    }));
  }
}

export const storage = new MemStorage();
