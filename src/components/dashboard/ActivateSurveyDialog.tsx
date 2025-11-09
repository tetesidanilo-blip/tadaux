import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivateSurveyDialogProps {
  surveyId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ActivateSurveyDialog = ({ surveyId, onClose, onSuccess }: ActivateSurveyDialogProps) => {
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [expiryTime, setExpiryTime] = useState<string>("23:59");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { t } = useLanguage();

  const handleClose = () => {
    setCalendarOpen(false);
    setShowExpiry(false);
    setExpiryDate(undefined);
    setExpiryTime("23:59");
    onClose();
  };

  const handleActivate = async () => {
    if (!surveyId) return;

    try {
      const updateData: any = { is_active: true };
      
      if (expiryDate) {
        const [hours, minutes] = expiryTime.split(':');
        const combinedDateTime = new Date(expiryDate);
        combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        updateData.expires_at = combinedDateTime.toISOString();
      }

      const { error } = await supabase
        .from("surveys")
        .update(updateData)
        .eq("id", surveyId);

      if (error) throw error;

      toast.success(t("surveyActivated"));
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error activating survey:", error);
      toast.error("Failed to activate survey");
    }
  };

  return (
    <Dialog key={surveyId || 'closed'} open={!!surveyId} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Attiva Questionario</DialogTitle>
          <DialogDescription>
            {showExpiry ? "Imposta la data di scadenza" : "Vuoi attivare il questionario?"}
          </DialogDescription>
        </DialogHeader>
        
        {!showExpiry ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Puoi attivare il questionario senza scadenza o aggiungere una data di scadenza.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data di scadenza</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : <span>Seleziona data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onInteractOutside={() => setCalendarOpen(false)}>
                  <DatePicker
                    mode="single"
                    selected={expiryDate}
                    onSelect={(date) => {
                      setExpiryDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {expiryDate && (
              <div className="space-y-2">
                <Label>Ora di scadenza</Label>
                <Input
                  type="time"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                />
              </div>
            )}

            {expiryDate && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Il questionario scadrà il {format(expiryDate, "PPP")} alle {expiryTime}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annulla
          </Button>
          
          {!showExpiry && (
            <Button variant="secondary" onClick={() => setShowExpiry(true)}>
              Aggiungi scadenza
            </Button>
          )}
          
          <Button onClick={handleActivate}>
            Attiva Questionario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
