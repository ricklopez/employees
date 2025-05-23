import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, ArrowLeft } from "lucide-react";
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
  const companySlug = params.companySlug;
  const agentId = params.agentId ? parseInt(params.agentId) : null;
  const [message, setMessage] = useState("");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <p className="text-muted-foreground">AI Assistant Platform</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Agent Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Available Agents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  {agentsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading agents...
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No agents assigned to this company
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {agents.map((agent) => (
                        <Link key={agent.id} href={`/${companySlug}/chat/${agent.id}`}>
                          <div
                            className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                              agent.id === agentId ? "bg-accent border-primary" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{agent.icon}</div>
                              <div className="flex-1">
                                <h3 className="font-medium text-sm">{agent.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {agent.description}
                                </p>
                                <div className="flex gap-1 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {agent.active ? "Active" : "Inactive"}
                                  </Badge>
                                  {agent.isGlobal && (
                                    <Badge variant="outline" className="text-xs">
                                      Global
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedAgent ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{selectedAgent.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{selectedAgent.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messagesLoading ? (
                        <div className="text-center text-muted-foreground">
                          Loading messages...
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Bot className="h-12 w-12 mx-auto mb-4" />
                          <p>Start a conversation with {selectedAgent.name}</p>
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
                              <Avatar className="h-8 w-8">
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
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            {msg.role === "user" && (
                              <Avatar className="h-8 w-8">
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

                  {/* Message Input */}
                  <div className="border-t p-4">
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
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select an Agent</h3>
                  <p className="text-muted-foreground">
                    Choose an AI agent from the sidebar to start chatting
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}