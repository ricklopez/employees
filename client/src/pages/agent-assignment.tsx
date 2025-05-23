import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Building2, Bot, Settings, ArrowLeft, Plus } from "lucide-react";
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

type CompanyAgentType = {
  id: number;
  companyId: number;
  agentId: number;
  assignedAt: string;
};

interface AgentAssignmentProps {
  companyId: string;
}

export default function AgentAssignment({ companyId }: AgentAssignmentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Fetch company details
  const { data: company, isLoading: companyLoading } = useQuery<CompanyType>({
    queryKey: ["/api/admin/companies", companyId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/companies/${companyId}`);
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

  // Fetch company's assigned agents
  const { data: assignedAgents = [], isLoading: assignedLoading } = useQuery<AgentType[]>({
    queryKey: ["/api/admin/companies", companyId, "agents"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/companies/${companyId}/agents`);
      return res.json();
    },
  });

  // Assign agents mutation
  const assignAgentsMutation = useMutation({
    mutationFn: async (agentIds: number[]) => {
      const res = await apiRequest("POST", `/api/admin/companies/${companyId}/agents`, {
        agentIds
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies", companyId, "agents"] });
      setSelectedAgents([]);
      setIsAssignDialogOpen(false);
      toast({
        title: "Agents assigned successfully!",
        description: `Selected agents have been assigned to ${company?.name}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign agents",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove agent mutation
  const removeAgentMutation = useMutation({
    mutationFn: async (agentId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/companies/${companyId}/agents/${agentId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies", companyId, "agents"] });
      toast({
        title: "Agent removed",
        description: "Agent has been successfully removed from the company.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignAgents = () => {
    if (selectedAgents.length > 0) {
      assignAgentsMutation.mutate(selectedAgents);
    }
  };

  const handleAgentSelection = (agentId: number, checked: boolean) => {
    if (checked) {
      setSelectedAgents([...selectedAgents, agentId]);
    } else {
      setSelectedAgents(selectedAgents.filter(id => id !== agentId));
    }
  };

  const availableAgents = agents.filter(
    agent => !assignedAgents.some(assigned => assigned.id === agent.id)
  );

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

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading company details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h1 className="text-3xl font-bold">{company?.name}</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Manage AI agents assigned to this company. Control which agents are available for company users.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assigned Agents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Assigned Agents
                  </CardTitle>
                  <CardDescription>
                    AI agents currently available to this company
                  </CardDescription>
                </div>
                <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Agents
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Agents to {company?.name}</DialogTitle>
                      <DialogDescription>
                        Select which AI agents should be available to this company
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {availableAgents.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          All agents are already assigned to this company
                        </p>
                      ) : (
                        availableAgents.map((agent) => (
                          <div key={agent.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                            <Checkbox
                              id={`agent-${agent.id}`}
                              checked={selectedAgents.includes(agent.id)}
                              onCheckedChange={(checked) => 
                                handleAgentSelection(agent.id, checked === true)
                              }
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <i className={`ri-${agent.icon}-line text-primary`}></i>
                                </div>
                                <div>
                                  <h4 className="font-semibold">{agent.name}</h4>
                                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {agent.isGlobal && (
                                <Badge variant="secondary">Global</Badge>
                              )}
                              {agent.active ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {availableAgents.length > 0 && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsAssignDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAssignAgents}
                          disabled={selectedAgents.length === 0 || assignAgentsMutation.isPending}
                        >
                          {assignAgentsMutation.isPending ? "Assigning..." : `Assign ${selectedAgents.length} Agent${selectedAgents.length !== 1 ? 's' : ''}`}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {assignedLoading ? (
                <div className="text-center py-8">Loading assigned agents...</div>
              ) : assignedAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No agents assigned yet. Click "Assign Agents" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <i className={`ri-${agent.icon}-line text-primary`}></i>
                        </div>
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">{agent.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.isGlobal && (
                          <Badge variant="secondary">Global</Badge>
                        )}
                        {agent.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAgentMutation.mutate(agent.id)}
                          disabled={removeAgentMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                All Available Agents
              </CardTitle>
              <CardDescription>
                Overview of all AI agents in the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <div className="text-center py-8">Loading agents...</div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <i className={`ri-${agent.icon}-line text-primary`}></i>
                        </div>
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">{agent.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.isGlobal && (
                          <Badge variant="secondary">Global</Badge>
                        )}
                        {agent.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                        {assignedAgents.some(assigned => assigned.id === agent.id) && (
                          <Badge variant="outline">Assigned</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}