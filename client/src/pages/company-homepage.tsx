import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
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

export default function CompanyHomepage() {
  const params = useParams();
  const companySlug = params.companySlug;

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

  if (companyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative container mx-auto px-4 pt-16 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {company.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {company.name}
                </h1>
                <p className="text-muted-foreground">AI Assistant Platform</p>
              </div>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Welcome to your AI-powered workspace. Choose from our specialized assistants to help streamline your business operations.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Powered by advanced AI technology</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="container mx-auto px-4 pb-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Choose Your AI Assistant</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Each assistant is specially trained to help with specific business functions. Click on any assistant to start a conversation.
          </p>
        </div>

        {agentsLoading ? (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4 animate-pulse" />
            <p className="text-lg text-muted-foreground">Loading assistants...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-2xl font-bold mb-4">No Assistants Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              There are currently no AI assistants assigned to this company. Please contact your administrator.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/${companySlug}/chat/${agent.id}`}>
                <Card className="group cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] border-2 hover:border-primary/20 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{agent.icon}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {agent.name}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={agent.active ? "default" : "secondary"} className="text-xs">
                            {agent.active ? "Active" : "Inactive"}
                          </Badge>
                          {agent.isGlobal && (
                            <Badge variant="outline" className="text-xs">
                              Global
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed mb-4">
                      {agent.description}
                    </CardDescription>
                    <Button 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
                      variant="outline"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Start Chat
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold mb-8">Why Choose Our AI Assistants?</h3>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Specialized Knowledge</h4>
              <p className="text-sm text-muted-foreground">
                Each assistant is trained for specific business functions and industries.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Natural Conversations</h4>
              <p className="text-sm text-muted-foreground">
                Powered by advanced AI for human-like interactions and responses.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Always Available</h4>
              <p className="text-sm text-muted-foreground">
                Get instant help 24/7 without waiting for human support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}