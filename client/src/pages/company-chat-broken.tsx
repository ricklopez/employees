import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, ArrowLeft, MessageSquare, Plus } from "lucide-react";
import { Link } from "wouter";

type Company = {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
};

type Agent = {
  id: number;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  isGlobal: boolean;
};

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  conversationId: number;
};

type Conversation = {
  id: number;
  title: string;
  agentId: number;
  userId: number;
  createdAt: string;
};

export default function CompanyChat() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const companySlug = params.companySlug;
  const agentId = params.agentId ? parseInt(params.agentId) : null;
  const [message, setMessage] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(agentId);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Fetch company by slug
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/companies/slug", companySlug],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/companies/slug/${companySlug}`);
      return res.json();
    },
    enabled: !!companySlug,
  });

  // Fetch company agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/companies", company?.id, "agents"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/companies/${company!.id}/agents`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  // Find selected agent
  const selectedAgent = agents.find(agent => agent.id === agentId);

  // Fetch messages for current conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversation?.id, "messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/conversations/${currentConversation!.id}/messages`);
      return res.json();
    },
    enabled: !!currentConversation?.id,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({ agentId, title }: { agentId: number; title: string }) => {
      const res = await apiRequest("POST", "/api/conversations", {
        title,
        agentId,
      });
      return res.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversation(conversation);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, conversationId }: { content: string; conversationId: number }) => {
      const res = await apiRequest("POST", "/api/messages", {
        content,
        conversationId,
        role: "user",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversation?.id, "messages"] });
      setMessage("");
    },
  });

  // Initialize conversation when agent is selected
  useEffect(() => {
    if (selectedAgent && !currentConversation) {
      createConversationMutation.mutate({
        agentId: selectedAgent.id,
        title: `Chat with ${selectedAgent.name}`,
      });
    }
  }, [selectedAgent, currentConversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && currentConversation) {
      sendMessageMutation.mutate({
        content: message.trim(),
        conversationId: currentConversation.id,
      });
    }
  };

  if (companyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading company...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Company Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The company "{companySlug}" could not be found.
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all conversations for this company
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", company?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/conversations?companyId=${company!.id}`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  // Handle agent selection change
  const handleAgentChange = (newAgentId: string) => {
    const agentIdNum = parseInt(newAgentId);
    setSelectedAgentId(agentIdNum);
    setLocation(`/${companySlug}/chat/${agentIdNum}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {company?.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{company?.name}</h1>
              <p className="text-sm text-muted-foreground">AI Employee Platform</p>
            </div>
          </div>
          
          <Link href="/">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Main
            </Button>
          </Link>
        </div>

        {/* Agent Selection */}
        <div className="p-4 border-b">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Select an Agent
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Choose an agent from the sidebar
              </p>
            </div>
            
            <Select value={selectedAgentId?.toString() || ""} onValueChange={handleAgentChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Please select an agent to start a conversation." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.icon}</span>
                      <span>{agent.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Recent Conversations
            </h3>
            <ScrollArea className="h-[calc(100vh-320px)]">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => {
                    const agent = agents.find(a => a.id === conversation.agentId);
                    return (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                          currentConversation?.id === conversation.id 
                            ? "bg-accent border-primary" 
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => {
                          setCurrentConversation(conversation);
                          if (conversation.agentId) {
                            setSelectedAgentId(conversation.agentId);
                            setLocation(`/${companySlug}/chat/${conversation.agentId}`);
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="text-lg">{agent?.icon || "🤖"}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{conversation.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent?.name} • {new Date(conversation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          <>
            {/* Chat Header */}
            <div className="border-b bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{selectedAgent.icon}</div>
                <div>
                  <h2 className="font-semibold">{selectedAgent.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">{selectedAgent.icon}</div>
                      <h3 className="text-lg font-medium mb-2">Start a conversation with {selectedAgent.name}</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {selectedAgent.description}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback>
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        {msg.role === "user" && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Message Input */}
            <div className="border-t bg-card p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Message ${selectedAgent.name}...`}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Select an Agent</h3>
              <p className="text-muted-foreground">
                Please select an agent to start a conversation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}