import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Tag } from "lucide-react";
import { format } from "date-fns";

interface ResearchRequestCardProps {
  id: string;
  title: string;
  description: string | null;
  topics: string[];
  targetParticipants: number;
  currentParticipants: number;
  deadline: string | null;
  status: string;
  onApply?: () => void;
  onManage?: () => void;
  variant?: "public" | "owner";
}

export const ResearchRequestCard = ({
  title,
  description,
  topics,
  targetParticipants,
  currentParticipants,
  deadline,
  status,
  onApply,
  onManage,
  variant = "public"
}: ResearchRequestCardProps) => {
  const spotsLeft = targetParticipants - currentParticipants;
  const isFull = spotsLeft <= 0;

  const statusColors = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    completed: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <Badge className={statusColors[status as keyof typeof statusColors]}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {topics.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {currentParticipants}/{targetParticipants} participants
            </span>
            {isFull && <Badge variant="destructive" className="ml-2">Full</Badge>}
          </div>

          {deadline && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due {format(new Date(deadline), "MMM dd, yyyy")}</span>
            </div>
          )}
        </div>

        {variant === "public" && onApply && (
          <Button 
            onClick={onApply} 
            className="w-full" 
            disabled={isFull || status !== "active"}
          >
            {isFull ? "Full" : "Apply to Participate"}
          </Button>
        )}

        {variant === "owner" && onManage && (
          <Button onClick={onManage} className="w-full" variant="outline">
            View Applications ({currentParticipants})
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
