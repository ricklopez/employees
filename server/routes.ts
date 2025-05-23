import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { 
  insertAgentSchema, 
  insertConversationSchema, 
  insertMessageSchema,
  insertTransactionSchema
} from "@shared/schema";
import { analyzeTransactions } from "./services/openai";
import { parseCsvFile } from "./services/csvParser";
import fs from "fs";

// Define custom Request type with file property added by multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

import { setupAuth, requireAuth, requireRole } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  // Configure multer for file upload
  // Ensure uploads directory exists
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow CSV files
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    }
  });

  // API routes
  // Get all agents
  app.get('/api/agents', async (req: Request, res: Response) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific agent
  app.get('/api/agents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get conversations
  app.get('/api/conversations', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new conversation
  app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
      const validateResult = insertConversationSchema.safeParse(req.body);
      
      if (!validateResult.success) {
        return res.status(400).json({ message: 'Invalid conversation data', errors: validateResult.error.errors });
      }
      
      const conversation = await storage.createConversation(validateResult.data);
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get messages for a conversation
  app.get('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a message
  app.post('/api/messages', async (req: Request, res: Response) => {
    try {
      const validateResult = insertMessageSchema.safeParse(req.body);
      
      if (!validateResult.success) {
        return res.status(400).json({ message: 'Invalid message data', errors: validateResult.error.errors });
      }
      
      const message = await storage.createMessage(validateResult.data);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Process CSV file
  app.post('/api/upload-csv', upload.single('file'), async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const conversationId = parseInt(req.body.conversationId);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Valid conversationId is required' });
      }
      
      const filePath = req.file.path;
      
      // Parse the CSV file
      const transactions = await parseCsvFile(filePath);
      
      // Analyze the transactions with OpenAI
      const classifiedTransactions = await analyzeTransactions(transactions);
      
      // Create transaction records in storage
      const transactionsToInsert = classifiedTransactions.map(tx => ({
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        conversationId: conversationId
      }));
      
      const savedTransactions = await storage.createTransactions(transactionsToInsert);
      
      // Get transaction summary
      const summary = await storage.getTransactionSummary(conversationId);
      
      // Return the classified transactions and summary
      res.status(200).json({
        originalFilename: req.file.originalname,
        transactions: savedTransactions,
        summary: summary
      });
      
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get transactions for a conversation
  app.get('/api/conversations/:id/transactions', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      const transactions = await storage.getTransactions(conversationId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get transaction summary for a conversation
  app.get('/api/conversations/:id/transaction-summary', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      const summary = await storage.getTransactionSummary(conversationId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
