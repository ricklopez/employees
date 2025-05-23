import { pgTable, text, serial, integer, boolean, json, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Companies/Accounts table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 50 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  name: true,
  slug: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Users with role-based permissions
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<"admin" | "company_manager" | "company_user">(),
  companyId: integer("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
  companyId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Agents with global/company-specific support
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  active: boolean("active").default(true).notNull(),
  isGlobal: boolean("is_global").default(false).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  description: true,
  icon: true,
  promptTemplate: true,
  active: true,
  isGlobal: true,
  createdByUserId: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Company-Agent assignments (many-to-many)
export const companyAgents = pgTable("company_agents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertCompanyAgentSchema = createInsertSchema(companyAgents).pick({
  companyId: true,
  agentId: true,
});

export type InsertCompanyAgent = z.infer<typeof insertCompanyAgentSchema>;
export type CompanyAgent = typeof companyAgents.$inferSelect;

// Conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: integer("user_id").references(() => users.id),
  agentId: integer("agent_id").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
  userId: true,
  agentId: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  role: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Transactions for payroll
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  category: text("category").notNull(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  date: true,
  description: true,
  amount: true,
  category: true,
  conversationId: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Category schema for dropdown options
export const categorySchema = z.object({
  name: z.string(),
  color: z.string().optional()
});

export type Category = z.infer<typeof categorySchema>;

// Transaction summary schema
export const transactionSummarySchema = z.object({
  category: z.string(),
  total: z.number(),
  count: z.number()
});

export type TransactionSummary = z.infer<typeof transactionSummarySchema>;

// Database Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  companyAgents: many(companyAgents),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  conversations: many(conversations),
  createdAgents: many(agents),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [agents.createdByUserId],
    references: [users.id],
  }),
  companyAgents: many(companyAgents),
  conversations: many(conversations),
}));

export const companyAgentsRelations = relations(companyAgents, ({ one }) => ({
  company: one(companies, {
    fields: [companyAgents.companyId],
    references: [companies.id],
  }),
  agent: one(agents, {
    fields: [companyAgents.agentId],
    references: [agents.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [conversations.agentId],
    references: [agents.id],
  }),
  messages: many(messages),
  transactions: many(transactions),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  conversation: one(conversations, {
    fields: [transactions.conversationId],
    references: [conversations.id],
  }),
}));
