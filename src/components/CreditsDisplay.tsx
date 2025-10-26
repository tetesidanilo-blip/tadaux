import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CreditsDisplayProps {
  credits: number;
  className?: string;
  showTooltip?: boolean;
}

export const CreditsDisplay = ({ credits, className = "", showTooltip = true }: CreditsDisplayProps) => {
  const content = (
    <Badge variant="outline" className={`flex items-center gap-1.5 ${className}`}>
      <Coins className="h-4 w-4 text-amber-500" />
      <span className="font-semibold">{credits}</span>
    </Badge>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">
            Crediti disponibili per acquistare template premium nel Q Shop
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
