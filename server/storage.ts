import { 
  users, 
  companies,
  agents, 
  conversations, 
  messages, 
  transactions,
  type User, 
  type InsertUser, 
  type Company,
  type InsertCompany,
  type Agent, 
  type InsertAgent,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Transaction,
  type InsertTransaction,
  companyAgents,
  type CompanyAgent,
  type InsertCompanyAgent
} from "@shared/schema";
import fs from 'fs';
import path from 'path';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Company methods
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanies(): Promise<Company[]>;
  
  // Agent methods
  getAgents(companyId?: number): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  assignAgentToCompany(companyId: number, agentId: number): Promise<CompanyAgent>;
  getCompanyAgents(companyId: number): Promise<Agent[]>;
  removeAgentFromCompany(companyId: number, agentId: number): Promise<void>;
  
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

  // Skills methods
  getSkills(agentId: number): Promise<Skill[]>;
  getSkill(id: number): Promise<Skill | undefined>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill | undefined>;
  deleteSkill(id: number): Promise<void>;

  // Tasks methods
  getTasks(agentId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;

  // Task Comments methods
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;

  // Links methods
  getLinks(agentId: number): Promise<Link[]>;
  getLink(id: number): Promise<Link | undefined>;
  createLink(link: InsertLink): Promise<Link>;
  updateLink(id: number, link: Partial<InsertLink>): Promise<Link | undefined>;
  deleteLink(id: number): Promise<void>;

  // Session store for authentication
  sessionStore: any;
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

import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  // Agent methods
  async getAgents(companyId?: number): Promise<Agent[]> {
    if (companyId) {
      return await this.getCompanyAgents(companyId);
    }
    // Return all global agents if no company specified
    return await db.select().from(agents).where(eq(agents.isGlobal, true));
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values(insertAgent).returning();
    return agent;
  }

  async updateAgent(id: number, agentUpdate: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [agent] = await db.update(agents).set(agentUpdate).where(eq(agents.id, id)).returning();
    return agent || undefined;
  }

  async assignAgentToCompany(companyId: number, agentId: number): Promise<CompanyAgent> {
    const [assignment] = await db.insert(companyAgents).values({ companyId, agentId }).returning();
    return assignment;
  }

  async getCompanyAgents(companyId: number): Promise<Agent[]> {
    const result = await db
      .select({ agent: agents })
      .from(companyAgents)
      .innerJoin(agents, eq(companyAgents.agentId, agents.id))
      .where(and(
        eq(companyAgents.companyId, companyId),
        eq(agents.active, true)
      ));
    
    // Also include global agents
    const globalAgents = await db
      .select()
      .from(agents)
      .where(and(eq(agents.isGlobal, true), eq(agents.active, true)));

    return [...result.map(r => r.agent), ...globalAgents];
  }

  async removeAgentFromCompany(companyId: number, agentId: number): Promise<void> {
    await db
      .delete(companyAgents)
      .where(
        and(
          eq(companyAgents.companyId, companyId),
          eq(companyAgents.agentId, agentId)
        )
      );
  }

  // Conversation methods
  async getConversations(userId?: number): Promise<Conversation[]> {
    if (userId) {
      return await db.select().from(conversations).where(eq(conversations.userId, userId));
    }
    return await db.select().from(conversations);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }

  // Message methods
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Transaction methods
  async getTransactions(conversationId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.conversationId, conversationId));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async createTransactions(insertTransactions: InsertTransaction[]): Promise<Transaction[]> {
    return await db.insert(transactions).values(insertTransactions).returning();
  }

  async getTransactionSummary(conversationId: number): Promise<{ category: string; total: number; count: number; }[]> {
    const transactionList = await this.getTransactions(conversationId);
    const summaryMap = new Map<string, { total: number; count: number }>();

    for (const transaction of transactionList) {
      const amount = parseFloat(transaction.amount.replace(/[^0-9.-]/g, ''));
      const existing = summaryMap.get(transaction.category) || { total: 0, count: 0 };
      summaryMap.set(transaction.category, {
        total: existing.total + amount,
        count: existing.count + 1,
      });
    }

    return Array.from(summaryMap.entries()).map(([category, { total, count }]) => ({
      category,
      total,
      count,
    }));
  }

  // Skills methods
  async getSkills(agentId: number): Promise<Skill[]> {
    return await db.select().from(skills).where(eq(skills.agentId, agentId));
  }

  async getSkill(id: number): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  }

  async createSkill(insertSkill: InsertSkill): Promise<Skill> {
    const [skill] = await db.insert(skills).values(insertSkill).returning();
    return skill;
  }

  async updateSkill(id: number, skillUpdate: Partial<InsertSkill>): Promise<Skill | undefined> {
    const [skill] = await db.update(skills).set(skillUpdate).where(eq(skills.id, id)).returning();
    return skill || undefined;
  }

  async deleteSkill(id: number): Promise<void> {
    await db.delete(skills).where(eq(skills.id, id));
  }

  // Tasks methods
  async getTasks(agentId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.agentId, agentId));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db.update(tasks).set(taskUpdate).where(eq(tasks.id, id)).returning();
    return task || undefined;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Task Comments methods
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return await db.select().from(taskComments).where(eq(taskComments.taskId, taskId));
  }

  async createTaskComment(insertComment: InsertTaskComment): Promise<TaskComment> {
    const [comment] = await db.insert(taskComments).values(insertComment).returning();
    return comment;
  }

  // Links methods
  async getLinks(agentId: number): Promise<Link[]> {
    return await db.select().from(links).where(eq(links.agentId, agentId));
  }

  async getLink(id: number): Promise<Link | undefined> {
    const [link] = await db.select().from(links).where(eq(links.id, id));
    return link || undefined;
  }

  async createLink(insertLink: InsertLink): Promise<Link> {
    const [link] = await db.insert(links).values(insertLink).returning();
    return link;
  }

  async updateLink(id: number, linkUpdate: Partial<InsertLink>): Promise<Link | undefined> {
    const [link] = await db.update(links).set(linkUpdate).where(eq(links.id, id)).returning();
    return link || undefined;
  }

  async deleteLink(id: number): Promise<void> {
    await db.delete(links).where(eq(links.id, id));
  }
}

export const storage = new DatabaseStorage();
