import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AgentAssignment from "@/pages/agent-assignment";
import CompanyChat from "@/pages/company-chat";
import { AgentProvider } from "@/lib/agent-context";
import { ChatProvider } from "@/lib/chat-context";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Chat} />
      <ProtectedRoute path="/admin" component={AdminDashboard} requireRole={["admin"]} />
      <Route path="/admin/companies/:companyId/agents">
        {(params) => <AgentAssignment companyId={params.companyId} />}
      </Route>
      <Route path="/:companySlug/chat/:agentId?">
        {(params) => <CompanyChat />}
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AgentProvider>
            <ChatProvider>
              <Toaster />
              <Router />
            </ChatProvider>
          </AgentProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
