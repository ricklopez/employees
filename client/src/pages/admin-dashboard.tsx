import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Bot, Plus, Settings } from "lucide-react";
import { Link } from "wouter";

type CompanyType = {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
};

type AgentType = {
  id: number;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  isGlobal: boolean;
};

type UserType = {
  id: number;
  username: string;
  email: string;
  role: "admin" | "company_manager" | "company_user";
  companyId?: number;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newCompany, setNewCompany] = useState({ name: "", slug: "" });
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);

  // Fetch companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery<CompanyType[]>({
    queryKey: ["/api/admin/companies"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/companies");
      return res.json();
    },
  });

  // Fetch all agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<AgentType[]>({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agents");
      return res.json();
    },
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: { name: string; slug: string }) => {
      const res = await apiRequest("POST", "/api/admin/companies", companyData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      setNewCompany({ name: "", slug: "" });
      setIsCreateCompanyOpen(false);
      toast({
        title: "Company created!",
        description: "New company has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create company",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize agents mutation
  const initializeAgentsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/agents/initialize");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "AI Agents Created!",
        description: "Professional AI agents have been successfully created with OpenAI integration.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create agents",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializeAgents = () => {
    initializeAgentsMutation.mutate();
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCompany.name && newCompany.slug) {
      createCompanyMutation.mutate(newCompany);
    }
  };

  const handleSlugGeneration = () => {
    const slug = newCompany.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setNewCompany({ ...newCompany, slug });
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage companies, users, and AI agents across your platform
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Companies</p>
                  <p className="text-2xl font-bold">{companies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">AI Agents</p>
                  <p className="text-2xl font-bold">{agents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="agents">AI Agents</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Companies</CardTitle>
                    <CardDescription>
                      Manage client companies and their access to AI agents
                    </CardDescription>
                  </div>
                  <Dialog open={isCreateCompanyOpen} onOpenChange={setIsCreateCompanyOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Company</DialogTitle>
                        <DialogDescription>
                          Add a new client company to the platform
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCompany} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="company-name">Company Name</Label>
                          <Input
                            id="company-name"
                            value={newCompany.name}
                            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                            placeholder="e.g., Acme Corporation"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-slug">Slug</Label>
                          <div className="flex gap-2">
                            <Input
                              id="company-slug"
                              value={newCompany.slug}
                              onChange={(e) => setNewCompany({ ...newCompany, slug: e.target.value })}
                              placeholder="e.g., acme-corp"
                              required
                            />
                            <Button type="button" variant="outline" onClick={handleSlugGeneration}>
                              Generate
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Used for URLs and identification
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateCompanyOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createCompanyMutation.isPending}
                          >
                            {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="text-center py-8">Loading companies...</div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No companies yet. Create your first one!
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {companies.map((company) => (
                      <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{company.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Slug: {company.slug} • Created: {new Date(company.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/${company.slug}/chat`} target="_blank">
                            <Button variant="default" size="sm">
                              <Bot className="h-4 w-4 mr-2" />
                              View Company
                            </Button>
                          </Link>
                          <Link href={`/admin/companies/${company.id}/agents`}>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-2" />
                              Manage Agents
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI Agents</CardTitle>
                    <CardDescription>
                      Manage AI agents available across the platform
                    </CardDescription>
                  </div>
                  <Button
                    onClick={initializeAgents}
                    disabled={initializeAgentsMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    {initializeAgentsMutation.isPending ? 'Creating...' : 'Create AI Agents'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {agentsLoading ? (
                  <div className="text-center py-8">Loading agents...</div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h4 className="text-lg font-medium mb-2">No AI Agents Yet</h4>
                    <p className="text-muted-foreground mb-6">
                      Create professional AI agents powered by OpenAI to assign to your companies
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {agents.map((agent) => (
                      <div key={agent.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{agent.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{agent.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {agent.description}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant={agent.active ? "default" : "secondary"}>
                                {agent.active ? "Active" : "Inactive"}
                              </Badge>
                              {agent.isGlobal && (
                                <Badge variant="outline">Global</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Manage platform users and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  User management coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}