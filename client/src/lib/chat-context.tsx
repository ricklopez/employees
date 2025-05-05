import { createContext, useContext, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: number;
  conversationId: number;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

interface Conversation {
  id: number;
  title: string;
  userId?: number;
  agentId: number;
  createdAt: Date;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: string;
  category: string;
  conversationId: number;
  createdAt: Date;
}

interface TransactionSummary {
  category: string;
  total: number;
  count: number;
}

interface ChatContextType {
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  conversations: Conversation[];
  messages: Message[];
  transactions: Transaction[];
  transactionSummary: TransactionSummary[];
  isMessagesLoading: boolean;
  isConversationsLoading: boolean;
  isTransactionsLoading: boolean;
  isSummaryLoading: boolean;
  createConversation: (agentId: number, title?: string) => Promise<Conversation>;
  sendMessage: (content: string) => Promise<Message>;
  uploadCSV: (file: File) => Promise<{ transactions: Transaction[], summary: TransactionSummary[] }>;
}

const ChatContext = createContext<ChatContextType>({
  currentConversation: null,
  setCurrentConversation: () => {},
  conversations: [],
  messages: [],
  transactions: [],
  transactionSummary: [],
  isMessagesLoading: false,
  isConversationsLoading: false,
  isTransactionsLoading: false,
  isSummaryLoading: false,
  createConversation: async () => ({ id: 0, title: '', agentId: 0, createdAt: new Date() }),
  sendMessage: async () => ({ id: 0, conversationId: 0, content: '', role: 'user', createdAt: new Date() }),
  uploadCSV: async () => ({ transactions: [], summary: [] }),
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    enabled: true,
  });

  // Fetch messages for current conversation
  const { data: messages = [], isLoading: isMessagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${currentConversation?.id}/messages`],
    enabled: !!currentConversation,
  });

  // Fetch transactions for current conversation
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/conversations/${currentConversation?.id}/transactions`],
    enabled: !!currentConversation,
  });

  // Fetch transaction summary for current conversation
  const { data: transactionSummary = [], isLoading: isSummaryLoading } = useQuery<TransactionSummary[]>({
    queryKey: [`/api/conversations/${currentConversation?.id}/transaction-summary`],
    enabled: !!currentConversation && transactions.length > 0,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({ agentId, title }: { agentId: number, title: string }) => {
      const res = await apiRequest('POST', '/api/conversations', { agentId, title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, role }: { conversationId: number, content: string, role: 'user' | 'assistant' }) => {
      const res = await apiRequest('POST', '/api/messages', { conversationId, content, role });
      return res.json();
    },
    onSuccess: () => {
      if (currentConversation) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${currentConversation.id}/messages`] });
      }
    },
  });

  // Upload CSV mutation
  const uploadCSVMutation = useMutation({
    mutationFn: async ({ file, conversationId }: { file: File, conversationId: number }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId.toString());
      
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload CSV: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      if (currentConversation) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${currentConversation.id}/transactions`] });
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${currentConversation.id}/transaction-summary`] });
      }
    },
  });

  // Helper functions
  const createConversation = async (agentId: number, title?: string): Promise<Conversation> => {
    const conversation = await createConversationMutation.mutateAsync({ 
      agentId, 
      title: title || `Conversation ${new Date().toLocaleString()}` 
    });
    setCurrentConversation(conversation);
    return conversation;
  };

  const sendMessage = async (content: string): Promise<Message> => {
    if (!currentConversation) {
      throw new Error("No active conversation");
    }
    
    const message = await sendMessageMutation.mutateAsync({
      conversationId: currentConversation.id,
      content,
      role: 'user'
    });
    
    // For simplicity, we're simulating the assistant response here
    // In a real app, this would be handled by the server or via a streaming API
    setTimeout(async () => {
      await sendMessageMutation.mutateAsync({
        conversationId: currentConversation.id,
        content: "How can I help you with your payroll processing today?",
        role: 'assistant'
      });
    }, 1000);
    
    return message;
  };

  const uploadCSV = async (file: File): Promise<{ transactions: Transaction[], summary: TransactionSummary[] }> => {
    if (!currentConversation) {
      throw new Error("No active conversation");
    }
    
    const result = await uploadCSVMutation.mutateAsync({
      file,
      conversationId: currentConversation.id
    });
    
    return result;
  };

  return (
    <ChatContext.Provider
      value={{
        currentConversation,
        setCurrentConversation,
        conversations,
        messages,
        transactions,
        transactionSummary,
        isMessagesLoading,
        isConversationsLoading,
        isTransactionsLoading,
        isSummaryLoading,
        createConversation,
        sendMessage,
        uploadCSV,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
