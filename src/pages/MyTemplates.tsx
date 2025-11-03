import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Coins, FileText, TrendingUp, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [newPrice, setNewPrice] = useState<number>(0);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['my-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_templates')
        .select(`
          *,
          surveys (
            title,
            description,
            sections
          )
        `)
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && profile?.subscription_tier === 'pro',
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ templateId, price }: { templateId: string; price: number }) => {
      const { error } = await supabase
        .from('survey_templates')
        .update({ 
          credit_price: price,
          is_free: price === 0 
        })
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-templates'] });
      toast.success("Prezzo aggiornato con successo");
      setEditingTemplate(null);
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento del prezzo");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('survey_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-templates'] });
      toast.success("Template eliminato con successo");
    },
    onError: () => {
      toast.error("Errore nell'eliminazione del template");
    },
  });

  if (profile?.subscription_tier !== 'pro') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Accesso Limitato</CardTitle>
              <CardDescription>
                Questa funzionalità è disponibile solo per gli utenti PRO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Passa a PRO</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const totalCreditsEarned = templates?.reduce((sum, t) => sum + (t.total_credits_earned || 0), 0) || 0;
  const totalClones = templates?.reduce((sum, t) => sum + (t.times_cloned || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">I Miei Template</h1>
          <p className="text-muted-foreground">
            Gestisci i template che hai pubblicato nel Q Shop
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Template Pubblicati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{templates?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilizzi Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                {totalClones}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Crediti Guadagnati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Coins className="h-6 w-6 text-yellow-500" />
                {totalCreditsEarned}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </>
          ) : templates && templates.length > 0 ? (
            templates.map((template) => {
              const sections = Array.isArray(template.surveys?.sections) ? template.surveys.sections : [];
              const questionCount = sections.reduce(
                (acc: number, section: any) => acc + (section.questions?.length || 0), 
                0
              );

              return (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">
                            {template.surveys?.title}
                          </CardTitle>
                          <Badge variant={template.is_free ? "secondary" : "default"}>
                            {template.is_free ? "Gratis" : `${template.credit_price} crediti`}
                          </Badge>
                        </div>
                        <CardDescription>
                          {template.surveys?.description || "Nessuna descrizione"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{questionCount} domande</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{template.times_cloned} utilizzi</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4" />
                          <span>{template.total_credits_earned} crediti guadagnati</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template);
                            setNewPrice(template.credit_price);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifica Prezzo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Sei sicuro di voler eliminare questo template?")) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Non hai ancora pubblicato template nel Q Shop
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Edit Price Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Prezzo Template</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price">Nuovo Prezzo (0-500 crediti)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                max="500"
                value={newPrice}
                onChange={(e) => {
                  const value = Math.min(500, Math.max(0, parseInt(e.target.value) || 0));
                  setNewPrice(value);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Imposta 0 per rendere il template gratuito
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                if (editingTemplate) {
                  updatePriceMutation.mutate({
                    templateId: editingTemplate.id,
                    price: newPrice,
                  });
                }
              }}
              disabled={updatePriceMutation.isPending}
            >
              {updatePriceMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
