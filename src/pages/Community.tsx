import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResearchRequestCard } from "@/components/ResearchRequestCard";
import { ApplyToResearchDialog } from "@/components/ApplyToResearchDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageCircle, ExternalLink, FileText, Store, Search } from "lucide-react";
import { PublicSurveyCard } from "@/components/PublicSurveyCard";
import { TemplateCard } from "@/components/TemplateCard";
import { CloneTemplateDialog } from "@/components/CloneTemplateDialog";

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

interface PublicSurvey {
  id: string;
  title: string;
  description: string | null;
  share_token: string;
  expires_at: string | null;
  responses_public: boolean;
  profiles: {
    full_name: string | null;
    subscription_tier: string;
  };
}

interface Template {
  id: string;
  credit_price: number;
  is_free: boolean;
  times_cloned: number;
  surveys: {
    title: string;
    description: string | null;
    sections: any;
  };
  profiles: {
    full_name: string | null;
  };
}

export default function Community() {
  const [activeRequests, setActiveRequests] = useState<ResearchRequest[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);
  const [publicSurveys, setPublicSurveys] = useState<PublicSurvey[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
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
      fetchPublicSurveys(),
      fetchTemplates(),
      fetchActiveRequests(),
      fetchMyApplications(),
      fetchCommunityGroups(),
      fetchUserCredits()
    ]);
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("survey_templates")
      .select(`
        id,
        credit_price,
        is_free,
        times_cloned,
        surveys!inner(title, description, sections, is_active, status),
        profiles!survey_templates_creator_id_fkey(full_name)
      `)
      .order("times_cloned", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
    } else {
      setTemplates(data || []);
    }
  };

  const fetchUserCredits = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();
    
    if (data) setUserCredits(data.credits || 0);
  };

  const fetchPublicSurveys = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select(`
        id,
        title,
        description,
        share_token,
        expires_at,
        responses_public,
        profiles!surveys_user_id_fkey (
          full_name,
          subscription_tier
        )
      `)
      .eq("visible_in_community", true)
      .eq("status", "published")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching public surveys:", error);
    } else {
      setPublicSurveys(data || []);
    }
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

  const handleCloneTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCloneDialogOpen(true);
  };

  const filteredTemplates = searchTerm.trim().length >= 3 
    ? templates.filter(t => {
        const search = searchTerm.toLowerCase();
        return t.surveys.title.toLowerCase().includes(search) ||
               t.surveys.description?.toLowerCase().includes(search);
      })
    : templates;

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

        <Tabs defaultValue="surveys" className="space-y-6">
          <TabsList>
            <TabsTrigger value="surveys">Public Surveys</TabsTrigger>
            <TabsTrigger value="qshop">
              <Store className="h-4 w-4 mr-2" />
              Q Shop
            </TabsTrigger>
            <TabsTrigger value="requests">Active Requests</TabsTrigger>
            <TabsTrigger value="applications">My Applications</TabsTrigger>
            <TabsTrigger value="groups">Community Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="surveys" className="space-y-4">
            {publicSurveys.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessun questionario pubblico</h3>
                  <p className="text-muted-foreground">
                    I questionari visibili nella community appariranno qui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {publicSurveys.map((survey) => (
                  <PublicSurveyCard
                    key={survey.id}
                    id={survey.id}
                    title={survey.title}
                    description={survey.description}
                    shareToken={survey.share_token}
                    expiresAt={survey.expires_at}
                    responsesPublic={survey.responses_public}
                    creatorName={survey.profiles?.full_name || null}
                    creatorTier={survey.profiles?.subscription_tier || 'free'}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="qshop" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Q Shop</h2>
                <p className="text-sm text-muted-foreground">
                  Clona template di questionari creati dalla community
                </p>
              </div>
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm ? "Nessun template trovato" : "Nessun template disponibile"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Prova con altri termini di ricerca" : "I template della community appariranno qui"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClone={() => handleCloneTemplate(template)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

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

      {selectedTemplate && (
        <CloneTemplateDialog
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          template={selectedTemplate}
          userCredits={userCredits}
          onSuccess={() => {
            fetchUserCredits();
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}
