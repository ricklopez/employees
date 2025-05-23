import { useState, useEffect } from "react";
import { useAgents } from "@/lib/agent-context";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Plus,
  Settings,
  User,
  MoreVertical,
  MessageSquare,
  LogOut,
  Shield,
} from "lucide-react";
import { Link } from "wouter";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const { agents, currentAgent, setCurrentAgent, isLoading } = useAgents();
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    createConversation,
  } = useChat();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [truncatedConversations, setTruncatedConversations] = useState<
    typeof conversations
  >([]);

  useEffect(() => {
    // Show only the most recent 5 conversations
    setTruncatedConversations(conversations.slice(0, 5));
  }, [conversations]);

  const handleNewChat = async () => {
    if (!currentAgent) {
      toast({
        title: "No agent selected",
        description: "Please select an agent first",
        variant: "destructive",
      });
      return;
    }

    try {
      await createConversation(currentAgent.id);
      toast({
        title: "New conversation created",
        description: "You can now start chatting with the agent",
      });
    } catch (error) {
      toast({
        title: "Failed to create conversation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSelectAgent = (agent: typeof currentAgent) => {
    if (agent) {
      setCurrentAgent(agent);
      onMobileClose();
    }
  };

  const handleSelectConversation = (
    conversation: typeof currentConversation,
  ) => {
    if (conversation) {
      setCurrentConversation(conversation);
      onMobileClose();
    }
  };

  const sidebarClasses = `${
    isMobileOpen ? "fixed inset-0 z-40 flex" : "hidden md:flex md:flex-shrink-0"
  }`;

  return (
    <div className={sidebarClasses}>
      <div className="flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-sidebar text-sidebar-foreground">
        {/* Logo */}
        <div className="px-4 py-5 flex items-center justify-between">
          <div className="flex items-center">
            <LayoutDashboard className="text-primary h-5 w-5" />
            <span className="ml-2 text-lg font-semibold">Mitusa AI Agents</span>
          </div>
          <Button
            onClick={handleNewChat}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Admin Navigation - only show for admins */}
        {user?.role === "admin" && (
          <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Button>
            </Link>
          </div>
        )}

        {/* Agent Selector */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Select Agent
          </h2>

          {isLoading ? (
            <div className="w-full h-20 flex items-center justify-center">
              <div className="animate-pulse">Loading agents...</div>
            </div>
          ) : (
            <div className="space-y-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  className={`agent-transition w-full text-left py-2 px-3 mb-1 rounded-md flex items-center justify-between ${
                    currentAgent?.id === agent.id
                      ? "bg-primary/10 font-medium"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => handleSelectAgent(agent)}
                >
                  <div className="flex items-center">
                    <i
                      className={`ri-${agent.icon}-line ${
                        currentAgent?.id === agent.id
                          ? "text-primary"
                          : "text-gray-400"
                      }`}
                    ></i>
                    <span className="ml-2">{agent.name}</span>
                  </div>
                  {currentAgent?.id === agent.id && (
                    <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Recent Conversations
          </h2>

          {truncatedConversations.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center p-4">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1">
              {truncatedConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`w-full text-left py-2 px-3 mb-1 rounded-md flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-sm truncate ${
                    currentConversation?.id === conversation.id
                      ? "bg-primary/10 font-medium"
                      : ""
                  }`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <MessageSquare className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="truncate">{conversation.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Info & Settings */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="ml-2">
                <div className="text-sm font-medium">{user?.username}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
            </div>
            <div className="flex">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      {/* Overlay to close sidebar on mobile */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onMobileClose}
        />
      )}
    </div>
  );
}
