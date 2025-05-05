import { useState } from "react";
import { useAgents } from "@/lib/agent-context";
import { Button } from "@/components/ui/button";
import { Upload, Menu } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import ChatContainer from "@/components/layout/ChatContainer";
import ChatInput from "@/components/layout/ChatInput";
import TransactionDetailModal from "@/components/modal/TransactionDetailModal";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const { currentAgent } = useAgents();
  const { toast } = useToast();

  const handleFileUploadClick = () => {
    // If there's a ChatContainer component reference, trigger the file upload dialog
    const chatContainer = document.getElementById('chat-container');
    const uploadButton = chatContainer?.querySelector('button[class*="bg-primary text-white"]');
    
    if (uploadButton) {
      // If the upload button exists in the chat container, click it
      (uploadButton as HTMLButtonElement).click();
    } else {
      toast({
        title: "File Upload",
        description: "Please start a conversation first",
      });
    }
  };

  // Helper to get agent icon from icon name
  const getAgentIcon = (iconName: string) => {
    return <i className={`ri-${iconName}-line text-primary text-lg`}></i>;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        onMobileClose={() => setIsMobileSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <i className="ri-robot-2-line text-primary text-xl"></i>
            <span className="ml-2 text-lg font-semibold">AI Assistant</span>
          </div>
          <div className="w-10"></div> {/* Empty div for layout balance */}
        </div>
        
        {/* Agent Info */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {currentAgent ? (
                getAgentIcon(currentAgent.icon)
              ) : (
                <i className="ri-robot-2-line text-primary text-lg"></i>
              )}
            </div>
            <div className="ml-3">
              <h2 className="font-semibold">{currentAgent?.name || "Select an Agent"}</h2>
              <p className="text-sm text-muted-foreground">
                {currentAgent?.description || "Choose an agent from the sidebar"}
              </p>
            </div>
          </div>
          <div>
            <Button
              onClick={handleFileUploadClick}
              className="text-sm bg-primary text-white"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
          </div>
        </div>
        
        {/* Chat Messages Container */}
        <ChatContainer onOpenTransactionsModal={() => setIsTransactionModalOpen(true)} />
        
        {/* Chat Input Area */}
        <ChatInput />
      </div>
      
      {/* Transaction Detail Modal */}
      <TransactionDetailModal 
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
      />
    </div>
  );
}
