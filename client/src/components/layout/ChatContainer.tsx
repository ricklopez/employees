import { useState, useEffect, useRef } from "react";
import { useAgents } from "@/lib/agent-context";
import { useChat } from "@/lib/chat-context";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TransactionDetailModal from "@/components/modal/TransactionDetailModal";
import FileUpload from "@/components/layout/FileUpload";
import { User, Bot, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatContainerProps {
  onOpenTransactionsModal: () => void;
}

export default function ChatContainer({ onOpenTransactionsModal }: ChatContainerProps) {
  const { currentAgent } = useAgents();
  const { currentConversation, messages, transactions, transactionSummary, uploadCSV } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const { toast } = useToast();
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    try {
      setUploadedFile(file);
      setIsProcessing(true);
      setShowFileUpload(false);
      
      // Create a placeholder message about file upload
      const placeholderMessage = {
        id: Date.now(),
        conversationId: currentConversation?.id || 0,
        content: `Uploaded file: ${file.name}`,
        role: 'user' as const,
        createdAt: new Date()
      };
      
      // Process the file
      const result = await uploadCSV(file);
      
      setIsProcessing(false);
      
      // Create a toast notification
      toast({
        title: "CSV Processed Successfully",
        description: `Processed ${result.transactions.length} transactions`,
      });
      
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Error Processing File",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  // Helper to get agent icon from icon name
  const getAgentIcon = (iconName: string) => {
    return <i className={`ri-${iconName}-line text-primary text-lg`}></i>;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6" id="chat-container">
      {/* Welcome Message or No Conversation Message */}
      {messages.length === 0 && (
        <div className="flex message-transition bounce-in">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
            {currentAgent && getAgentIcon(currentAgent.icon)}
          </div>
          <div className="ml-3 bg-white dark:bg-gray-800 rounded-lg p-4 max-w-3xl shadow-sm">
            <p className="mb-3">
              {currentAgent
                ? `Welcome to the ${currentAgent.name}! I can help you process and classify your payroll data for QuickBooks. You can:`
                : "Please select an agent to start a conversation."}
            </p>
            {currentAgent && (
              <>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>Upload a CSV file of transactions</li>
                  <li>Let me classify them automatically</li>
                  <li>Review and adjust before exporting to QuickBooks</li>
                </ul>
                <p>Would you like to upload a CSV file to get started?</p>
                <div className="mt-4">
                  <Button 
                    onClick={() => setShowFileUpload(true)}
                    className="bg-primary text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Conversation Messages */}
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`flex message-transition bounce-in ${
            message.role === 'assistant' ? '' : 'justify-end'
          }`}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mr-3">
              {currentAgent && getAgentIcon(currentAgent.icon)}
            </div>
          )}
          
          <div 
            className={`max-w-3xl rounded-lg p-4 ${
              message.role === 'assistant' 
                ? 'bg-white dark:bg-gray-800 shadow-sm' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <p>{message.content}</p>
          </div>
          
          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center ml-3">
              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
          )}
        </div>
      ))}

      {/* File Upload Component */}
      {showFileUpload && (
        <div className="flex message-transition bounce-in">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
            {currentAgent && getAgentIcon(currentAgent.icon)}
          </div>
          <div className="ml-3 bg-white dark:bg-gray-800 rounded-lg p-4 max-w-3xl shadow-sm">
            <p className="mb-4">Great! Please upload your CSV file using the button below or drag and drop it into the highlighted area.</p>
            <FileUpload onFileUpload={handleFileUpload} />
          </div>
        </div>
      )}

      {/* Processing Message */}
      {isProcessing && (
        <div className="flex message-transition bounce-in">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
            {currentAgent && getAgentIcon(currentAgent.icon)}
          </div>
          <div className="ml-3 bg-white dark:bg-gray-800 rounded-lg p-4 max-w-3xl shadow-sm">
            <div className="flex items-center">
              <div className="mr-3 bg-primary/10 text-primary p-2 rounded-full">
                <i className="ri-file-list-3-line"></i>
              </div>
              <div>
                <p className="font-medium">{uploadedFile?.name}</p>
                <p className="text-sm text-muted-foreground">Uploaded successfully</p>
              </div>
            </div>
            <div className="mt-4 mb-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full w-full"></div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Processing and classifying transactions...
            </p>
          </div>
        </div>
      )}

      {/* Results Message - Show when transactions are available */}
      {transactions.length > 0 && !isProcessing && (
        <div className="flex message-transition bounce-in">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
            {currentAgent && getAgentIcon(currentAgent.icon)}
          </div>
          <div className="ml-3 bg-white dark:bg-gray-800 rounded-lg p-4 max-w-3xl shadow-sm">
            <p className="mb-4">I've analyzed your payroll data and classified all {transactions.length} transactions. Here's a summary:</p>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {transactionSummary.map((summary, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">{summary.category}</p>
                    <p className="text-lg font-semibold">${summary.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">{summary.count} transactions</p>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={onOpenTransactionsModal} 
                className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 font-medium"
              >
                View Detailed Classification
              </Button>
            </div>
            
            <p>Would you like to:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 font-medium">
                <i className="ri-upload-cloud-line mr-1"></i>
                Export to QuickBooks
              </Button>
              <Button variant="outline" className="bg-white dark:bg-gray-700 text-foreground border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium">
                <i className="ri-edit-line mr-1"></i>
                Edit Classifications
              </Button>
              <Button variant="outline" className="bg-white dark:bg-gray-700 text-foreground border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium">
                <i className="ri-download-line mr-1"></i>
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Agent typing indicator - dynamic based on state */}
      {isProcessing && (
        <div className="flex message-transition">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
            {currentAgent && getAgentIcon(currentAgent.icon)}
          </div>
          <div className="ml-3 bg-white dark:bg-gray-800 rounded-lg px-4 py-3 max-w-3xl shadow-sm inline-flex">
            <div className="typing-indicator flex">
              <span className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full mx-0.5"></span>
              <span className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full mx-0.5"></span>
              <span className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full mx-0.5"></span>
            </div>
          </div>
        </div>
      )}

      {/* Reference for auto-scrolling */}
      <div ref={messagesEndRef} />
    </div>
  );
}
