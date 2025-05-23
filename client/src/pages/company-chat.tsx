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
import { Send, Bot, User, ArrowLeft, MessageSquare, Plus, ExternalLink, Edit, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSkillSchema, Skill } from "@shared/schema";
import { z } from "zod";

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
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

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
                    onClick={() => setIsSkillsModalOpen(true)}
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
                    onClick={() => setIsLinksModalOpen(true)}
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

      {/* Links Modal */}
      <Dialog open={isLinksModalOpen} onOpenChange={setIsLinksModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Manage Links
              {selectedAgent && (
                <span className="text-sm font-normal text-muted-foreground">
                  for {selectedAgent.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <LinksModalContent 
            selectedAgentId={selectedAgentId} 
            onClose={() => setIsLinksModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Skills Modal */}
      <Dialog open={isSkillsModalOpen} onOpenChange={setIsSkillsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-5 w-5 bg-pink-500 rounded"></div>
              Manage Skills
              {selectedAgent && (
                <span className="text-sm font-normal text-muted-foreground">
                  for {selectedAgent.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <SkillsModalContent 
            selectedAgentId={selectedAgentId} 
            onClose={() => setIsSkillsModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Links Modal Content Component
function LinksModalContent({ selectedAgentId, onClose }: { 
  selectedAgentId: number | null; 
  onClose: () => void; 
}) {
  const [newLink, setNewLink] = useState({
    title: "",
    url: "",
    description: "",
    category: "",
    icon: ""
  });
  const [editingLink, setEditingLink] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch links for the selected agent
  const { data: links = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/agents", selectedAgentId, "links"],
    queryFn: async () => {
      if (!selectedAgentId) return [];
      const res = await apiRequest("GET", `/api/agents/${selectedAgentId}/links`);
      return res.json();
    },
    enabled: !!selectedAgentId,
  });

  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (linkData: any) => {
      const res = await apiRequest("POST", `/api/agents/${selectedAgentId}/links`, linkData);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setNewLink({ title: "", url: "", description: "", category: "", icon: "" });
      setShowAddForm(false);
    },
  });

  // Update link mutation
  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, ...linkData }: any) => {
      const res = await apiRequest("PUT", `/api/links/${id}`, linkData);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setEditingLink(null);
    },
  });

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      await apiRequest("DELETE", `/api/links/${linkId}`);
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateLink = () => {
    if (newLink.title && newLink.url) {
      createLinkMutation.mutate({
        ...newLink,
        active: true
      });
    }
  };

  const handleUpdateLink = () => {
    if (editingLink) {
      // Remove timestamp fields that shouldn't be updated
      const { createdAt, createdByUserId, ...updateData } = editingLink;
      updateLinkMutation.mutate({ id: editingLink.id, ...updateData });
    }
  };

  const handleDeleteLink = (linkId: number) => {
    if (confirm("Are you sure you want to delete this link?")) {
      deleteLinkMutation.mutate(linkId);
    }
  };

  if (!selectedAgentId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please select an agent to manage links.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Links List */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading links...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8">
              <ExternalLink className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No links configured for this agent yet.</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Link
              </Button>
            </div>
          ) : (
            <>
              {links.map((link: any) => (
                <div key={link.id} className="border rounded-lg p-4 space-y-2">
                  {editingLink?.id === link.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit-title">Title</Label>
                        <Input
                          id="edit-title"
                          value={editingLink.title}
                          onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })}
                          placeholder="Link title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-url">URL</Label>
                        <Input
                          id="edit-url"
                          value={editingLink.url}
                          onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                          id="edit-description"
                          value={editingLink.description || ""}
                          onChange={(e) => setEditingLink({ ...editingLink, description: e.target.value })}
                          placeholder="Brief description of this link"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-category">Category</Label>
                        <Input
                          id="edit-category"
                          value={editingLink.category || ""}
                          onChange={(e) => setEditingLink({ ...editingLink, category: e.target.value })}
                          placeholder="e.g., Documentation, API, Tool"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingLink(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateLink} disabled={updateLinkMutation.isPending}>
                          {updateLinkMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{link.title}</h3>
                            {link.category && (
                              <Badge variant="secondary" className="text-xs">
                                {link.category}
                              </Badge>
                            )}
                          </div>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm break-all"
                          >
                            {link.url}
                          </a>
                          {link.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {link.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingLink(link)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteLink(link.id)}
                            disabled={deleteLinkMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {!showAddForm && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Link
                </Button>
              )}
            </>
          )}

          {/* Add New Link Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <h3 className="font-medium">Add New Link</h3>
              <div>
                <Label htmlFor="new-title">Title</Label>
                <Input
                  id="new-title"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  placeholder="Link title"
                />
              </div>
              <div>
                <Label htmlFor="new-url">URL</Label>
                <Input
                  id="new-url"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="new-description">Description</Label>
                <Textarea
                  id="new-description"
                  value={newLink.description}
                  onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                  placeholder="Brief description of this link"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="new-category">Category</Label>
                <Input
                  id="new-category"
                  value={newLink.category}
                  onChange={(e) => setNewLink({ ...newLink, category: e.target.value })}
                  placeholder="e.g., Documentation, API, Tool"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateLink} 
                  disabled={!newLink.title || !newLink.url || createLinkMutation.isPending}
                >
                  {createLinkMutation.isPending ? "Adding..." : "Add Link"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Skills Modal Content Component
function SkillsModalContent({ selectedAgentId, onClose }: { 
  selectedAgentId: number | null; 
  onClose: () => void;
}) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data: skills = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/agents/${selectedAgentId}/skills`],
    enabled: !!selectedAgentId,
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
  });

  console.log('Skills query - selectedAgentId:', selectedAgentId);
  console.log('Skills query - enabled:', !!selectedAgentId);
  console.log('Skills data:', skills);
  console.log('Skills loading:', isLoading);

  const createSkillMutation = useMutation({
    mutationFn: async (skillData: any) => {
      const response = await apiRequest("POST", `/api/agents/${selectedAgentId}/skills`, skillData);
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      setIsFormOpen(false);
      toast({ title: "Success", description: "Skill created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, ...skillData }: any) => {
      const response = await apiRequest("PUT", `/api/skills/${id}`, skillData);
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      setEditingSkill(null);
      setIsFormOpen(false);
      toast({ title: "Success", description: "Skill updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/skills/${id}`);
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Success", description: "Skill deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        costPerUnit: z.coerce.number().min(0, "Cost must be positive"),
        unitLabel: z.string().optional(),
        limitUnits: z.coerce.number().min(1, "Limit must be at least 1"),
        limitInterval: z.string(),
        status: z.string(),
        playbookUrl: z.string().optional(),
      })
    ),
    defaultValues: {
      title: "",
      description: "",
      costPerUnit: 0,
      unitLabel: "",
      limitUnits: 1,
      limitInterval: "daily",
      status: "active",
      playbookUrl: "",
    },
  });

  useEffect(() => {
    if (editingSkill) {
      form.reset({
        title: editingSkill.title,
        description: editingSkill.description,
        costPerUnit: parseFloat(editingSkill.costPerUnit?.toString() || "0"),
        unitLabel: editingSkill.unitLabel || "",
        limitUnits: editingSkill.limitUnits || 1,
        limitInterval: editingSkill.limitInterval || "daily",
        status: editingSkill.status,
        playbookUrl: editingSkill.playbookUrl || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        costPerUnit: 0,
        unitLabel: "",
        limitUnits: 1,
        limitInterval: "daily",
        status: "active",
        playbookUrl: "",
      });
    }
  }, [editingSkill, form]);

  const onSubmit = (data: any) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    console.log('Selected agent ID:', selectedAgentId);
    
    // Add agentId and createdByUserId to the data
    const skillData = {
      ...data,
      agentId: selectedAgentId,
      createdByUserId: 1  // Will be set by the server from the authenticated user
    };
    
    console.log('Submitting skill data:', skillData);
    
    if (editingSkill) {
      updateSkillMutation.mutate({ id: editingSkill.id, ...skillData });
    } else {
      createSkillMutation.mutate(skillData);
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setIsFormOpen(true);
  };

  const handleDelete = (skill: Skill) => {
    if (confirm(`Are you sure you want to delete "${skill.title}"?`)) {
      deleteSkillMutation.mutate(skill.id);
    }
  };

  if (!selectedAgentId) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Please select an agent first</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Skills Management</h3>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-pink-600 hover:bg-pink-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {isFormOpen && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{editingSkill ? "Edit Skill" : "Create New Skill"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skill Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Document Analysis" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="deprecated">Deprecated</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this skill does..."
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="costPerUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Per Unit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Label</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., per page, per request" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="limitUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usage Limit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="limitInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit Interval</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="playbookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Playbook URL</FormLabel>
                        <FormControl>
                          <Input 
                            type="url"
                            placeholder="https://docs.example.com/playbook"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingSkill(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createSkillMutation.isPending || updateSkillMutation.isPending}
                    className="bg-pink-600 hover:bg-pink-700"
                    onClick={async (e) => {
                      console.log('Create Skill button clicked');
                      console.log('Form is valid:', form.formState.isValid);
                      console.log('Form errors:', form.formState.errors);
                      
                      // Manually validate and submit if valid
                      const isValid = await form.trigger();
                      if (isValid) {
                        console.log('Form validation passed, calling onSubmit');
                        form.handleSubmit(onSubmit)();
                      } else {
                        console.log('Form validation failed');
                      }
                    }}
                  >
                    {editingSkill ? "Update Skill" : "Create Skill"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No skills found for this agent.</p>
            <p className="text-sm">Click "Add Skill" to create the first one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {skills.map((skill: Skill) => (
              <Card key={skill.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{skill.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        skill.status === 'active' ? 'bg-green-100 text-green-700' :
                        skill.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {skill.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{skill.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Cost: ${skill.costPerUnit} {skill.unitLabel}</span>
                      <span>Limit: {skill.limitUnits} {skill.limitInterval}</span>
                      {skill.playbookUrl && (
                        <a 
                          href={skill.playbookUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          📖 Playbook
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(skill)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(skill)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}