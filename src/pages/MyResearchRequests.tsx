import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResearchRequestCard } from "@/components/ResearchRequestCard";
import { CreateResearchRequestDialog } from "@/components/CreateResearchRequestDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResearchRequest {
  id: string;
  title: string;
  description: string | null;
  topics: string[];
  target_participants: number;
  current_participants: number;
  deadline: string | null;
  status: string;
}

interface Application {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    interests: string[];
    age_range: string | null;
  };
}

export default function MyResearchRequests() {
  const [requests, setRequests] = useState<ResearchRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ResearchRequest | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewApplicationsOpen, setViewApplicationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("research_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load research requests",
        variant: "destructive"
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const fetchApplications = async (requestId: string) => {
    const { data, error } = await supabase
      .from("participant_applications")
      .select(`
        id,
        status,
        message,
        created_at,
        profiles (
          full_name,
          interests,
          age_range
        )
      `)
      .eq("research_request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setApplications(data || []);
    }
  };

  const handleViewApplications = async (request: ResearchRequest) => {
    setSelectedRequest(request);
    await fetchApplications(request.id);
    setViewApplicationsOpen(true);
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    const { error } = await supabase
      .from("participant_applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: `Application ${newStatus}`
      });
      if (selectedRequest) {
        fetchApplications(selectedRequest.id);
        fetchRequests();
      }
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("research_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Request deleted"
      });
      fetchRequests();
    }
  };

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    approved: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20"
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Research Requests</h1>
            <p className="text-muted-foreground">
              Manage your participant requests and review applications
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Request
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No research requests yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first request to find participants
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((request) => (
              <ResearchRequestCard
                key={request.id}
                {...request}
                targetParticipants={request.target_participants}
                currentParticipants={request.current_participants}
                variant="owner"
                onManage={() => handleViewApplications(request)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateResearchRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchRequests}
      />

      <AlertDialog open={viewApplicationsOpen} onOpenChange={setViewApplicationsOpen}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedRequest?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest?.current_participants} of {selectedRequest?.target_participants} participants
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No applications yet
              </div>
            ) : (
              applications.map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {app.profiles.full_name || "Anonymous"}
                        </CardTitle>
                        <CardDescription>
                          {app.profiles.age_range && `Age: ${app.profiles.age_range} • `}
                          Applied {new Date(app.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={statusColors[app.status as keyof typeof statusColors]}>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {app.profiles.interests.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Interests:</p>
                        <div className="flex flex-wrap gap-2">
                          {app.profiles.interests.map((interest) => (
                            <Badge key={interest} variant="secondary">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {app.message && (
                      <div>
                        <p className="text-sm font-medium mb-1">Message:</p>
                        <p className="text-sm text-muted-foreground">{app.message}</p>
                      </div>
                    )}

                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateApplicationStatus(app.id, "approved")}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateApplicationStatus(app.id, "rejected")}
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
