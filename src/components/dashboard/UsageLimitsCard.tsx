import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Crown } from "lucide-react";

interface UsageLimitsCardProps {
  surveysCreated: number;
  responsesCollected: number;
  onUpgradeClick: () => void;
}

export const UsageLimitsCard = ({ 
  surveysCreated, 
  responsesCollected, 
  onUpgradeClick 
}: UsageLimitsCardProps) => {
  return (
    <Card className="mb-6 border-l-4 border-l-primary">
      <CardContent className="flex items-center gap-4 pt-6">
        <AlertCircle className="h-8 w-8 text-primary flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-semibold">
              Free Plan
            </Badge>
            <p className="text-sm text-muted-foreground">
              You're using the Free plan
            </p>
          </div>
          
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Surveys Created</span>
                <span className="font-medium">{surveysCreated}/10</span>
              </div>
              <Progress value={(surveysCreated / 10) * 100} />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Responses Collected</span>
                <span className="font-medium">{responsesCollected}/20</span>
              </div>
              <Progress value={(responsesCollected / 20) * 100} />
            </div>
          </div>
        </div>
        
        <Button onClick={onUpgradeClick} className="flex-shrink-0">
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
      </CardContent>
    </Card>
  );
};
