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

// Skills table - templates and functions this agent can perform
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  template: text("template"), // Task template for this skill
  functionName: text("function_name"), // Function this skill can call
  parameters: text("parameters"), // JSON string of parameters
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
});

export const insertSkillSchema = createInsertSchema(skills).pick({
  agentId: true,
  title: true,
  description: true,
  template: true,
  functionName: true,
  parameters: true,
  active: true,
  createdByUserId: true,
});

export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skills.$inferSelect;

// Tasks table - completed function runs and task instances
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  skillId: integer("skill_id").references(() => skills.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "in_progress", "completed", "failed"] }).default("pending"),
  result: text("result"), // JSON string of function execution result
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  agentId: true,
  skillId: true,
  conversationId: true,
  title: true,
  description: true,
  status: true,
  result: true,
  assignedToUserId: true,
  createdByUserId: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Task Comments table - for users and members to comment on tasks
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).pick({
  taskId: true,
  userId: true,
  content: true,
});

export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;

// Links table - external tools specific to this agent
export const links = pgTable("links", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "dashboard", "analytics", "documentation"
  icon: text("icon"), // Icon identifier
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
});

export const insertLinkSchema = createInsertSchema(links).pick({
  agentId: true,
  title: true,
  url: true,
  description: true,
  category: true,
  icon: true,
  active: true,
  createdByUserId: true,
});

export type InsertLink = z.infer<typeof insertLinkSchema>;
export type Link = typeof links.$inferSelect;

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
  skills: many(skills),
  tasks: many(tasks),
  links: many(links),
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

export const skillsRelations = relations(skills, ({ one, many }) => ({
  agent: one(agents, {
    fields: [skills.agentId],
    references: [agents.id],
  }),
  createdBy: one(users, {
    fields: [skills.createdByUserId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  agent: one(agents, {
    fields: [tasks.agentId],
    references: [agents.id],
  }),
  skill: one(skills, {
    fields: [tasks.skillId],
    references: [skills.id],
  }),
  conversation: one(conversations, {
    fields: [tasks.conversationId],
    references: [conversations.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToUserId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
  }),
  comments: many(taskComments),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}));

export const linksRelations = relations(links, ({ one }) => ({
  agent: one(agents, {
    fields: [links.agentId],
    references: [agents.id],
  }),
  createdBy: one(users, {
    fields: [links.createdByUserId],
    references: [users.id],
  }),
}));
