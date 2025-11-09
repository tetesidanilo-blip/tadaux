import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BackupResult {
  profiles: { success: number; errors: number };
  surveys: { success: number; errors: number };
  survey_responses: { success: number; errors: number };
  credit_transactions: { success: number; errors: number };
}

export const BackupDatabaseCard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<{
    timestamp: string;
    results: BackupResult;
  } | null>(null);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-to-external', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        setLastBackup({
          timestamp: data.timestamp,
          results: data.results
        });
        toast({
          title: "Backup completato",
          description: "I dati sono stati copiati con successo sul database esterno.",
        });
      } else {
        throw new Error(data.error || 'Backup failed');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: "Errore durante il backup",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalSuccess = () => {
    if (!lastBackup) return 0;
    const { results } = lastBackup;
    return results.profiles.success + 
           results.surveys.success + 
           results.survey_responses.success + 
           results.credit_transactions.success;
  };

  const getTotalErrors = () => {
    if (!lastBackup) return 0;
    const { results } = lastBackup;
    return results.profiles.errors + 
           results.surveys.errors + 
           results.survey_responses.errors + 
           results.credit_transactions.errors;
  };

  return (
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Database Backup (Safety Net)
        </CardTitle>
        <CardDescription>
          Copia i tuoi dati sul database esterno Supabase come backup di sicurezza
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">
              Questo backup copia tutti i tuoi dati (profilo, survey, risposte, transazioni) 
              sul tuo database Supabase esterno (wnehlqsibqgzydkteptf) come piano B.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">✓ Profiles</Badge>
              <Badge variant="outline">✓ Surveys</Badge>
              <Badge variant="outline">✓ Responses</Badge>
              <Badge variant="outline">✓ Transactions</Badge>
            </div>
          </div>
          <Button 
            onClick={handleBackup} 
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Backup in corso...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Avvia Backup
              </>
            )}
          </Button>
        </div>

        {lastBackup && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Ultimo Backup Completato
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(lastBackup.timestamp).toLocaleString('it-IT')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Profiles</p>
                <p className="text-lg font-semibold">{lastBackup.results.profiles.success}</p>
                {lastBackup.results.profiles.errors > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {lastBackup.results.profiles.errors} errori
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Surveys</p>
                <p className="text-lg font-semibold">{lastBackup.results.surveys.success}</p>
                {lastBackup.results.surveys.errors > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {lastBackup.results.surveys.errors} errori
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Risposte</p>
                <p className="text-lg font-semibold">{lastBackup.results.survey_responses.success}</p>
                {lastBackup.results.survey_responses.errors > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {lastBackup.results.survey_responses.errors} errori
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Transazioni</p>
                <p className="text-lg font-semibold">{lastBackup.results.credit_transactions.success}</p>
                {lastBackup.results.credit_transactions.errors > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {lastBackup.results.credit_transactions.errors} errori
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Totale record copiati:</span>
              <span className="font-semibold text-green-600">{getTotalSuccess()}</span>
            </div>
            {getTotalErrors() > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Totale errori:</span>
                <span className="font-semibold text-destructive">{getTotalErrors()}</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">💡 Consiglio:</p>
          <p>Esegui questo backup mensilmente o prima di modifiche importanti per mantenere una copia di sicurezza aggiornata.</p>
        </div>
      </CardContent>
    </Card>
  );
};
