import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ApplyToResearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestTitle: string;
  onSuccess: () => void;
}

export const ApplyToResearchDialog = ({
  open,
  onOpenChange,
  requestId,
  requestTitle,
  onSuccess
}: ApplyToResearchDialogProps) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const profileIncomplete = !profile?.profile_completed;

  const handleApply = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("participant_applications")
        .insert({
          research_request_id: requestId,
          participant_id: user.id,
          message: message.trim() || null
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already applied",
            description: "You have already applied to this research request.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Application submitted!",
          description: "The researcher will review your application."
        });
        onOpenChange(false);
        onSuccess();
        setMessage("");
      }
    } catch (error) {
      console.error("Error applying:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply to: {requestTitle}</DialogTitle>
          <DialogDescription>
            Submit your application to participate in this research.
          </DialogDescription>
        </DialogHeader>

        {profileIncomplete && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete your profile before applying. Researchers prefer participants with complete profiles.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message to Researcher (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Why are you interested in participating? Any relevant experience?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
