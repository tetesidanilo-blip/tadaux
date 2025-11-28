import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface CreateResearchRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId?: string;
  onSuccess: () => void;
}

export const CreateResearchRequestDialog = ({
  open,
  onOpenChange,
  surveyId,
  onSuccess
}: CreateResearchRequestDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [targetParticipants, setTargetParticipants] = useState(10);
  const [deadline, setDeadline] = useState("");
  const [matchingEnabled, setMatchingEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();

  const userTier = profile?.subscription_tier || 'free';

  const addTopic = () => {
    if (currentTopic.trim() && !topics.includes(currentTopic.trim())) {
      setTopics([...topics, currentTopic.trim()]);
      setCurrentTopic("");
    }
  };

  const removeTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic));
  };

  const handleCreate = async () => {
    if (!user || !title.trim()) return;

    if (userTier === "free" && matchingEnabled) {
      toast({
        title: "Feature not available",
        description: "Auto-matching is a Pro feature. Upgrade to enable.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("research_requests")
        .insert({
          survey_id: surveyId || null,
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          topics,
          target_participants: targetParticipants,
          deadline: deadline || null,
          matching_enabled: matchingEnabled && userTier !== "free"
        });

      if (error) throw error;

      toast({
        title: "Research request created!",
        description: "Your request is now visible to potential participants."
      });

      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error creating request:", error);
      toast({
        title: "Error",
        description: "Failed to create research request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTopics([]);
    setCurrentTopic("");
    setTargetParticipants(10);
    setDeadline("");
    setMatchingEnabled(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find Participants</DialogTitle>
          <DialogDescription>
            Create a request to find participants for your research.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Looking for UX Designers for Usability Study"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your research and what you're looking for in participants..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topics">Topics</Label>
            <div className="flex gap-2">
              <Input
                id="topics"
                placeholder="Add a topic (e.g., UX, Healthcare)"
                value={currentTopic}
                onChange={(e) => setCurrentTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
              />
              <Button type="button" onClick={addTopic} variant="outline">
                Add
              </Button>
            </div>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {topics.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                    <button
                      onClick={() => removeTopic(topic)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Participants</Label>
              <Input
                id="target"
                type="number"
                min={1}
                max={1000}
                value={targetParticipants}
                onChange={(e) => setTargetParticipants(parseInt(e.target.value) || 10)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {userTier !== "free" && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="matching" className="text-base">
                  Enable Auto-Matching
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically match with participants based on their profiles
                </p>
              </div>
              <Switch
                id="matching"
                checked={matchingEnabled}
                onCheckedChange={setMatchingEnabled}
              />
            </div>
          )}

          {userTier === "free" && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                🔒 Auto-matching and advanced targeting are Pro features. 
                <Button variant="link" className="h-auto p-0 ml-1">
                  Upgrade to unlock
                </Button>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !title.trim()}>
            {loading ? "Creating..." : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
