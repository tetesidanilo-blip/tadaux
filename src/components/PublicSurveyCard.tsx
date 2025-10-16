import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Eye, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";

interface PublicSurveyCardProps {
  id: string;
  title: string;
  description: string | null;
  shareToken: string;
  expiresAt: string | null;
  responsesPublic: boolean;
  creatorName: string | null;
  creatorTier: string;
}

export const PublicSurveyCard = ({
  id,
  title,
  description,
  shareToken,
  expiresAt,
  responsesPublic,
  creatorName,
  creatorTier
}: PublicSurveyCardProps) => {
  const [responseCount, setResponseCount] = useState(0);

  useEffect(() => {
    fetchResponseCount();
  }, [id]);

  const fetchResponseCount = async () => {
    const { count } = await supabase
      .from("survey_responses")
      .select("*", { count: 'exact', head: true })
      .eq("survey_id", id);
    setResponseCount(count || 0);
  };

  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-2 line-clamp-2">
                {description}
              </CardDescription>
            )}
          </div>
          <Badge variant={creatorTier === 'pro' ? 'default' : 'secondary'}>
            {creatorTier === 'pro' ? '⭐ Pro' : 'Free'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {responseCount} rispost{responseCount !== 1 ? 'e' : 'a'}
          </span>
          {responsesPublic && (
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              Risposte pubbliche
            </Badge>
          )}
        </div>

        {expiresAt && (
          <div className="text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 inline mr-1" />
            {isExpired 
              ? <span className="text-destructive">Scaduto</span>
              : `Scade il ${format(new Date(expiresAt), 'dd/MM/yyyy')}`
            }
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1" disabled={isExpired}>
            <Link to={`/survey/${shareToken}`}>
              <FileText className="mr-2 h-4 w-4" />
              Compila Questionario
            </Link>
          </Button>
          
          {responsesPublic && (
            <Button asChild variant="outline">
              <Link to={`/survey-responses/${id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Vedi Risposte
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
