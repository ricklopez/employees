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
  const [isTyping, setIsTyping] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Always call ALL hooks at the top level - never conditionally
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/companies/slug", companySlug],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/companies/slug/${companySlug}`);
      return res.json();
    },
    enabled: !!companySlug,
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/companies", company?.id, "agents"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/companies/${company!.id}/agents`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  const { data: conversationsData } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", company?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/conversations?companyId=${company!.id}`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  // Ensure conversations is always an array
  const conversations = Array.isArray(conversationsData) ? conversationsData : [];

  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

  const { data: fetchedConversation } = useQuery<Conversation>({
    queryKey: ["/api/conversations", selectedAgentId],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", {
        title: `Chat with ${selectedAgent?.name}`,
        agentId: selectedAgentId,
        userId: 1
      });
      return res.json();
    },
    enabled: !!selectedAgentId && !!selectedAgent,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversation?.id, "messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/conversations/${currentConversation!.id}/messages`);
      return res.json();
    },
    enabled: !!currentConversation?.id,
    refetchInterval: isTyping ? 1000 : 2000, // Always refresh every 2 seconds to catch new messages
    staleTime: 0, // Always consider data stale to force fresh fetches
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversation) throw new Error("No conversation");
      
      setIsTyping(true);
      const res = await apiRequest("POST", "/api/messages", {
        conversationId: currentConversation.id,
        content,
        role: "user"
      });
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      
      // Immediately refresh to show user message
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", currentConversation?.id, "messages"],
      });
      
      // Stop typing indicator after 30 seconds (backup)
      setTimeout(() => {
        setIsTyping(false);
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", company?.id],
        });
      }, 30000);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  // Detect when AI response arrives and stop typing indicator
  useEffect(() => {
    if (messages.length > 0 && isTyping) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        setIsTyping(false);
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", company?.id],
        });
      }
    }
  }, [messages, isTyping, company?.id]);

  useEffect(() => {
    if (fetchedConversation) {
      setCurrentConversation(fetchedConversation);
    }
  }, [fetchedConversation]);

  const handleAgentChange = (newAgentId: string) => {
    const agentIdNum = parseInt(newAgentId);
    setSelectedAgentId(agentIdNum);
    setLocation(`/${companySlug}/chat/${agentIdNum}`);
  };

  const handleStartNewConversation = async () => {
    if (selectedAgentId && selectedAgent) {
      try {
        // Create a new conversation directly
        const res = await apiRequest("POST", "/api/conversations", {
          title: `New chat with ${selectedAgent.name}`,
          agentId: selectedAgentId,
          userId: 1
        });
        const newConversation = await res.json();
        
        // Set as current conversation
        setCurrentConversation(newConversation);
        
        // Update the URL to reflect the new conversation
        setLocation(`/${companySlug}/chat/${selectedAgentId}`);
        
        // Refresh conversation list
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", company?.id],
        });
        
        // Refresh messages for the new conversation
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", newConversation.id, "messages"],
        });
      } catch (error) {
        console.error('Failed to create new conversation:', error);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  // Now handle loading and error states AFTER all hooks
  if (companyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Bot className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Company Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The company "{companySlug}" could not be found. Please check the URL and try again.
          </p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {company.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{company.name}</h1>
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

            {/* New Conversation Button */}
            <Button 
              onClick={() => handleStartNewConversation()}
              className="w-full"
              variant="outline"
              disabled={!selectedAgentId}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{selectedAgent.icon}</div>
                  <div>
                    <h2 className="font-semibold">{selectedAgent.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                  </div>
                </div>
                
                {/* Skills, Tasks, Links Buttons */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-pink-500 text-pink-500 hover:bg-pink-50"
                  >
                    Skills
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-green-500 text-green-500 hover:bg-green-50"
                  >
                    Tasks
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-blue-500 text-blue-500 hover:bg-blue-50"
                  >
                    Links
                  </Button>
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
                    <>
                      {messages.map((msg) => (
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
                      ))}
                      
                      {/* Typing Indicator */}
                      {isTyping && (
                        <div className="flex gap-3 justify-start">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback>
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted p-3 rounded-lg">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
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