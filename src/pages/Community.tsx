import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResearchRequestCard } from "@/components/ResearchRequestCard";
import { ApplyToResearchDialog } from "@/components/ApplyToResearchDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageCircle, ExternalLink } from "lucide-react";

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
  created_at: string;
  research_requests: {
    title: string;
    description: string | null;
  };
}

interface CommunityGroup {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  invite_link: string;
  topics: string[];
  member_count: number;
}

export default function Community() {
  const [activeRequests, setActiveRequests] = useState<ResearchRequest[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ResearchRequest | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchActiveRequests(),
      fetchMyApplications(),
      fetchCommunityGroups()
    ]);
    setLoading(false);
  };

  const fetchActiveRequests = async () => {
    const { data, error } = await supabase
      .from("research_requests")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
    } else {
      setActiveRequests(data || []);
    }
  };

  const fetchMyApplications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("participant_applications")
      .select(`
        id,
        status,
        created_at,
        research_requests (
          title,
          description
        )
      `)
      .eq("participant_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setMyApplications(data || []);
    }
  };

  const fetchCommunityGroups = async () => {
    const { data, error } = await supabase
      .from("community_groups")
      .select("*")
      .eq("is_active", true)
      .order("member_count", { ascending: false });

    if (error) {
      console.error("Error fetching groups:", error);
    } else {
      setCommunityGroups(data || []);
    }
  };

  const handleApply = (request: ResearchRequest) => {
    setSelectedRequest(request);
    setApplyDialogOpen(true);
  };

  const platformIcons = {
    whatsapp: "💬",
    discord: "🎮",
    telegram: "✈️",
    other: "🔗"
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Community</h1>
          <p className="text-muted-foreground">
            Discover research opportunities and connect with other researchers
          </p>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">Active Requests</TabsTrigger>
            <TabsTrigger value="applications">My Applications</TabsTrigger>
            <TabsTrigger value="groups">Community Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {activeRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active requests</h3>
                  <p className="text-muted-foreground">
                    Check back later for new research opportunities
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeRequests.map((request) => (
                  <ResearchRequestCard
                    key={request.id}
                    {...request}
                    targetParticipants={request.target_participants}
                    currentParticipants={request.current_participants}
                    onApply={() => handleApply(request)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            {myApplications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-muted-foreground">
                    Browse active requests and apply to participate
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myApplications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{app.research_requests.title}</CardTitle>
                          <CardDescription>{app.research_requests.description}</CardDescription>
                        </div>
                        <Badge className={statusColors[app.status as keyof typeof statusColors]}>
                          {app.status}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            {communityGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No community groups yet</h3>
                  <p className="text-muted-foreground">
                    Community groups will be added soon
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {communityGroups.map((group) => (
                  <Card key={group.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <span>{platformIcons[group.platform as keyof typeof platformIcons]}</span>
                            {group.name}
                          </CardTitle>
                          <CardDescription>{group.description}</CardDescription>
                        </div>
                        <Badge variant="secondary">{group.member_count} members</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {group.topics.map((topic) => (
                            <Badge key={topic} variant="outline">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button asChild className="w-full">
                        <a href={group.invite_link} target="_blank" rel="noopener noreferrer">
                          Join Group <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedRequest && (
        <ApplyToResearchDialog
          open={applyDialogOpen}
          onOpenChange={setApplyDialogOpen}
          requestId={selectedRequest.id}
          requestTitle={selectedRequest.title}
          onSuccess={fetchMyApplications}
        />
      )}
    </div>
  );
}
