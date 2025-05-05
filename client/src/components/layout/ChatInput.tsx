import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/chat-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Send } from "lucide-react";

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const { currentConversation, sendMessage } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (!currentConversation) {
      toast({
        title: "No active conversation",
        description: "Please start a new conversation first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await sendMessage(message);
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to calculate new height
    textarea.style.height = "auto";
    
    // Set new height based on scrollHeight (content)
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
    
    // Set overflow to auto if max height is reached
    textarea.style.overflowY = textarea.scrollHeight > 150 ? "auto" : "hidden";
  };

  // Handle file attachment button click (placeholder)
  const handleAttachment = () => {
    toast({
      title: "Attachment feature",
      description: "Please use the upload button at the top to upload CSV files",
    });
  };

  useEffect(() => {
    // Initialize textarea height
    handleTextareaInput();
  }, []);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <div className="relative">
        <Textarea
          id="chat-input"
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          rows={1}
          className="resize-none block w-full px-4 py-3 pr-16 rounded-lg border border-input focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder={currentConversation ? "Message the agent..." : "Start a conversation..."}
          disabled={!currentConversation}
        />
        <div className="absolute right-2 bottom-2.5 flex">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleAttachment}
            className="mr-1 text-muted-foreground hover:text-foreground"
            disabled={!currentConversation}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={handleSendMessage}
            disabled={!message.trim() || !currentConversation}
            className="h-8 w-8 rounded-lg bg-primary text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">
        The AI Agent processes your data to provide financial insights and classification.
      </div>
    </div>
  );
}
