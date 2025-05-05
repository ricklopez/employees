import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import { AgentProvider } from "@/lib/agent-context";
import { ChatProvider } from "@/lib/chat-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <AgentProvider>
        <ChatProvider>
          <Toaster />
          <Router />
        </ChatProvider>
      </AgentProvider>
    </TooltipProvider>
  );
}

export default App;
