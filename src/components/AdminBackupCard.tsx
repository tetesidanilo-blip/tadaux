import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Database, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BackupResult {
  profiles: { success: number; errors: number };
  surveys: { success: number; errors: number };
  survey_responses: { success: number; errors: number };
  credit_transactions: { success: number; errors: number };
}

export const AdminBackupCard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<{
    timestamp: string;
    results: BackupResult;
    totalRecords: number;
  } | null>(null);

  const handleFullBackup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-full-backup', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        const totalRecords = 
          data.results.profiles.success + 
          data.results.surveys.success + 
          data.results.survey_responses.success + 
          data.results.credit_transactions.success;

        setLastBackup({
          timestamp: new Date().toISOString(),
          results: data.results,
          totalRecords
        });
        
        toast({
          title: "✅ Backup Completo Amministrativo Eseguito",
          description: `${totalRecords} record totali copiati sul database esterno.`,
        });
      } else {
        throw new Error(data.error || 'Full backup failed');
      }
    } catch (error) {
      console.error('Admin backup error:', error);
      toast({
        title: "Errore durante il backup amministrativo",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalSuccess = () => {
    if (!lastBackup) return 0;
    return lastBackup.totalRecords;
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
    <Card className="border-2 border-primary/20 md:col-span-3">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Full Database Backup
              <Badge variant="default" className="ml-2">
                ADMIN ONLY
              </Badge>
            </CardTitle>
            <CardDescription>
              Backup completo di TUTTI i dati di TUTTI gli utenti sul database esterno
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attenzione:</strong> Questa funzione esporta i dati di TUTTI gli utenti della piattaforma. 
            Usare solo per backup amministrativi completi.
          </AlertDescription>
        </Alert>

        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">
              Questo backup amministrativo copia l'intero database (tutti i profili, survey, risposte, transazioni) 
              sul database Supabase esterno (wnehlqsibqgzydkteptf) per disaster recovery.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">✓ All Profiles</Badge>
              <Badge variant="secondary">✓ All Surveys</Badge>
              <Badge variant="secondary">✓ All Responses</Badge>
              <Badge variant="secondary">✓ All Transactions</Badge>
            </div>
          </div>
          <Button 
            onClick={handleFullBackup} 
            disabled={loading}
            size="lg"
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Backup in corso...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Avvia Full Backup
              </>
            )}
          </Button>
        </div>

        {lastBackup && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Ultimo Full Backup Completato
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(lastBackup.timestamp).toLocaleString('it-IT')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground">Profiles (ALL)</p>
                <p className="text-lg font-semibold">{lastBackup.results.profiles.success}</p>
                {lastBackup.results.profiles.errors > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {lastBackup.results.profiles.errors} errori
                  </p>
                )}
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground">Surveys (ALL)</p>
                <p className="text-lg font-semibold">{lastBackup.results.surveys.success}</p>
                {lastBackup.results.surveys.errors > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {lastBackup.results.surveys.errors} errori
                  </p>
                )}
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground">Risposte (ALL)</p>
                <p className="text-lg font-semibold">{lastBackup.results.survey_responses.success}</p>
                {lastBackup.results.survey_responses.errors > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {lastBackup.results.survey_responses.errors} errori
                  </p>
                )}
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground">Transazioni (ALL)</p>
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
              <span className="text-muted-foreground">Totale record globali copiati:</span>
              <span className="font-semibold text-green-600 text-lg">{getTotalSuccess()}</span>
            </div>
            {getTotalErrors() > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Totale errori:</span>
                <span className="font-semibold text-destructive">{getTotalErrors()}</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-primary/10 rounded-lg p-3 text-xs text-foreground border border-primary/30">
          <p className="font-semibold mb-1">🔒 Sicurezza:</p>
          <p>Solo gli utenti con ruolo 'admin' possono eseguire questa operazione. Tutte le azioni sono loggate.</p>
        </div>
      </CardContent>
    </Card>
  );
};
