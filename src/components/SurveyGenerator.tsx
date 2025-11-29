import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Languages, Plus, Download, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { SaveSurveyDialog } from "./SaveSurveyDialog";
import { useSurveyState, Question, Section } from "@/hooks/useSurveyState";
import { useSurveyActions } from "@/hooks/useSurveyActions";
import { ErrorBoundary } from "./ErrorBoundary";

// Survey sub-components
import { SurveyInputPanel } from "./survey/SurveyInputPanel";
import { SurveyPreviewHeader } from "./survey/SurveyPreviewHeader";
import { SectionList } from "./survey/SectionList";
import { AddSectionDialog } from "./survey/AddSectionDialog";
import { MoreQuestionsDialog } from "./survey/MoreQuestionsDialog";
import { PreviewDialog } from "./survey/PreviewDialog";

// Export utilities
import { exportToCSV, exportToWord, exportToPDF, getAllQuestions } from "@/lib/surveyExport";

interface SurveyGeneratorProps {
  onBack: () => void;
  editingSurvey?: any;
}

export const SurveyGenerator = ({ onBack, editingSurvey }: SurveyGeneratorProps) => {
  const { language: uiLanguage, setLanguage: setUiLanguage, t } = useLanguage();
  const [state, dispatch] = useSurveyState(editingSurvey);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const {
    generateSurvey: generateSurveyMutation,
    generateMoreQuestions: generateMoreMutation,
    refineQuestion: refineMutation,
    refineBatchQuestions: refineBatchMutation,
  } = useSurveyActions();

  const {
    sections, language, currentDraftId, isSaving, showSaveDialog, showPreview,
    addingSectionDialog, showMoreQuestionsDialog, currentSectionForMore,
    newModelDescription, moreQuestionsCount, history, historyIndex, showingFeedback,
    newSectionTitle, newSectionDescription, newSectionLanguage, newSectionQuestionCount,
  } = state;

  // Autosave effect
  useEffect(() => {
    if (sections.length === 0) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      dispatch({ type: 'SET_IS_SAVING', payload: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const shareToken = currentDraftId ? undefined : Math.random().toString(36).substring(2, 15);

        if (currentDraftId) {
          const { error } = await supabase
            .from('surveys')
            .update({ sections: sections as any, language, updated_at: new Date().toISOString() })
            .eq('id', currentDraftId);
          if (error) throw error;
        } else {
          const draftTitle = sections[0]?.name || 'Bozza senza titolo';
          const { data, error } = await supabase
            .from('surveys')
            .insert([{
              user_id: user.id, sections: sections as any, language,
              title: draftTitle, status: 'draft', share_token: shareToken!, is_active: false
            }])
            .select()
            .single();
          if (error) throw error;
          if (data) dispatch({ type: 'SET_CURRENT_DRAFT_ID', payload: data.id });
        }
      } catch (error) {
        console.error("Error autosaving:", error);
      } finally {
        dispatch({ type: 'SET_IS_SAVING', payload: false });
      }
    }, 1000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [sections, language, currentDraftId, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) dispatch({ type: 'UNDO' });
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (historyIndex < history.length - 1) dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, dispatch]);

  // File handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword" ||
          file.type === "text/csv") {
        if (file.type === "text/csv") {
          handleCSVImport(file);
        } else {
          dispatch({ type: 'SET_UPLOADED_FILE', payload: file });
          toast({ title: t("fileUploaded"), description: `${file.name} ${t("fileReady")}` });
        }
      } else {
        toast({ title: t("invalidFileType"), description: t("uploadPDFOrWord"), variant: "destructive" });
      }
    }
  };

  const handleCSVImport = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast({ title: t("invalidCSV"), description: t("csvMustHaveData"), variant: "destructive" });
        return;
      }
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const sectionIndex = headers.indexOf('Section');
      const questionIndex = headers.indexOf('Question');
      const typeIndex = headers.indexOf('Type');
      const requiredIndex = headers.indexOf('Required');
      const optionStartIndex = headers.findIndex(h => h.startsWith('Option'));

      if (sectionIndex === -1 || questionIndex === -1 || typeIndex === -1) {
        toast({ title: t("invalidCSVFormat"), description: t("csvMissingColumns"), variant: "destructive" });
        return;
      }

      const sectionMap = new Map<string, Question[]>();
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const sName = values[sectionIndex] || "Sezione Importata";
        const questionText = values[questionIndex];
        const typeText = values[typeIndex];
        const required = values[requiredIndex]?.toLowerCase() === 'yes';

        let type = "short_answer";
        if (typeText.toLowerCase().includes("multiple choice")) type = "multiple_choice";
        else if (typeText.toLowerCase().includes("checkbox")) type = "checkbox";
        else if (typeText.toLowerCase().includes("paragraph")) type = "paragraph";
        else if (typeText.toLowerCase().includes("dropdown")) type = "dropdown";

        const options: string[] = [];
        if (optionStartIndex !== -1) {
          for (let j = optionStartIndex; j < values.length; j++) {
            if (values[j]?.trim()) options.push(values[j]);
          }
        }

        const question: Question = { question: questionText, type, options: options.length > 0 ? options : undefined, required, section: sName };
        if (!sectionMap.has(sName)) sectionMap.set(sName, []);
        sectionMap.get(sName)!.push(question);
      }

      const importedSections: Section[] = Array.from(sectionMap.entries()).map(([name, questions]) => ({ name, questions }));
      dispatch({ type: 'SET_SECTIONS', payload: [...sections, ...importedSections] });

      const totalQuestions = importedSections.reduce((sum, s) => sum + s.questions.length, 0);
      toast({ title: t("csvImported"), description: `${importedSections.length} ${t("sections")} e ${totalQuestions} ${t("totalQuestions")} ${t("imported")}` });
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast({ title: t("importFailed"), description: t("failedToImportCSV"), variant: "destructive" });
    }
  };

  // Generation handlers
  const handleGenerate = async () => {
    const { description, sectionName, uploadedFile, questionCount } = state;
    if (!description && !uploadedFile) {
      toast({ title: t("inputRequired"), description: t("provideDescription"), variant: "destructive" });
      return;
    }
    if (!sectionName.trim()) {
      toast({ title: t("sectionNameRequired"), description: t("provideSectionName"), variant: "destructive" });
      return;
    }

    dispatch({ type: 'SET_IS_GENERATING', payload: true });
    generateSurveyMutation.mutate(
      { description: uploadedFile ? `Document: ${uploadedFile.name}` : description, hasDocument: !!uploadedFile, language, questionCount },
      {
        onSuccess: (data) => {
          const newQuestions = data.questions.map((q: Question) => ({ ...q, section: sectionName }));
          dispatch({ type: 'ADD_SECTION', payload: { name: sectionName, questions: newQuestions } });
          dispatch({ type: 'RESET_GENERATION_FORM' });
          toast({ title: t("sectionAdded"), description: `${newQuestions.length} ${t("questionsAdded")} "${sectionName}"` });
        },
        onError: () => toast({ title: t("generationFailed"), description: t("failedToGenerate"), variant: "destructive" }),
        onSettled: () => dispatch({ type: 'SET_IS_GENERATING', payload: false }),
      }
    );
  };

  const generateNewSection = async () => {
    if (!newSectionTitle.trim()) {
      toast({ title: t("sectionNameRequired"), description: t("provideSectionName"), variant: "destructive" });
      return;
    }
    if (!newSectionDescription.trim()) {
      toast({ title: t("inputRequired"), description: t("provideDescription"), variant: "destructive" });
      return;
    }

    dispatch({ type: 'SET_GENERATING_NEW_SECTION', payload: true });
    generateSurveyMutation.mutate(
      { description: newSectionDescription, hasDocument: false, language: newSectionLanguage, questionCount: newSectionQuestionCount },
      {
        onSuccess: (data) => {
          const newQuestions = data.questions.map((q: Question) => ({ ...q, section: newSectionTitle }));
          dispatch({ type: 'ADD_SECTION', payload: { name: newSectionTitle, questions: newQuestions } });
          dispatch({ type: 'RESET_NEW_SECTION_FORM' });
          toast({ title: t("sectionAdded"), description: `${newQuestions.length} ${t("questionsAdded")} "${newSectionTitle}"` });
        },
        onError: () => toast({ title: t("generationFailed"), description: t("failedToGenerate"), variant: "destructive" }),
        onSettled: () => dispatch({ type: 'SET_GENERATING_NEW_SECTION', payload: false }),
      }
    );
  };

  const generateMoreQuestions = async (sectionIndex: number) => {
    const section = sections[sectionIndex];
    dispatch({ type: 'SET_GENERATING_MORE', payload: sectionIndex });
    generateMoreMutation.mutate(
      { description: `Generate additional questions similar to the existing ones in section "${section.name}". Existing questions: ${section.questions.map(q => q.question).join(", ")}`, language },
      {
        onSuccess: (data) => {
          const newQuestions = data.questions.map((q: Question) => ({ ...q, section: section.name }));
          dispatch({ type: 'ADD_QUESTIONS_TO_SECTION', payload: { sectionIndex, questions: newQuestions } });
          toast({ title: t("questionsAdded"), description: `${newQuestions.length} ${t("newQuestionsAdded")}` });
        },
        onError: () => toast({ title: t("generationFailed"), description: t("failedToGenerate"), variant: "destructive" }),
        onSettled: () => dispatch({ type: 'SET_GENERATING_MORE', payload: null }),
      }
    );
  };

  const generateMoreQuestionsWithDescription = async (sectionIndex: number, description: string) => {
    const section = sections[sectionIndex];
    dispatch({ type: 'SET_GENERATING_MORE', payload: sectionIndex });
    generateMoreMutation.mutate(
      { description, language, questionCount: moreQuestionsCount },
      {
        onSuccess: (data) => {
          const newQuestions = data.questions.map((q: Question) => ({ ...q, section: section.name }));
          dispatch({ type: 'ADD_QUESTIONS_TO_SECTION', payload: { sectionIndex, questions: newQuestions } });
          dispatch({ type: 'SET_MORE_QUESTIONS_COUNT', payload: null });
          toast({ title: t("questionsAdded"), description: `${newQuestions.length} ${t("newQuestionsAdded")}` });
        },
        onError: () => toast({ title: t("generationFailed"), description: t("failedToGenerate"), variant: "destructive" }),
        onSettled: () => dispatch({ type: 'SET_GENERATING_MORE', payload: null }),
      }
    );
  };

  // Feedback handlers
  const applyFeedbackToQuestion = async (sectionIndex: number, questionIndex: number) => {
    const question = sections[sectionIndex].questions[questionIndex];
    if (!question.feedback) {
      toast({ title: t("noFeedback"), description: t("noFeedbackDesc"), variant: "destructive" });
      return;
    }
    dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: true });
    refineMutation.mutate(
      { question: question.question, feedback: question.feedback, type: question.type, options: question.options, language },
      {
        onSuccess: (data) => {
          dispatch({ type: 'UPDATE_QUESTION_WITH_FEEDBACK', payload: { sectionIndex, questionIndex, question: data.questions[0] } });
          toast({ title: t("feedbackApplied"), description: t("feedbackAppliedDesc") });
        },
        onError: () => toast({ title: t("generationFailed"), description: t("failedToGenerate"), variant: "destructive" }),
        onSettled: () => dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: false }),
      }
    );
  };

  const applyFeedbackToMultipleQuestions = async (questions: Array<{sectionIndex: number, questionIndex: number}>, feedback: string) => {
    dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: true });
    const questionsToRefine = questions.map(({sectionIndex, questionIndex}) => {
      const q = sections[sectionIndex].questions[questionIndex];
      return { question: q.question, feedback, type: q.type, options: q.options };
    });
    refineBatchMutation.mutate(
      { questions: questionsToRefine, language },
      {
        onSuccess: (results) => {
          results.forEach((data, index) => {
            const { sectionIndex, questionIndex } = questions[index];
            dispatch({ type: 'UPDATE_QUESTION_WITH_FEEDBACK', payload: { sectionIndex, questionIndex, question: data.questions[0] } });
          });
          toast({ title: t("feedbackApplied"), description: `${t("feedbackAppliedDesc")} ${results.length} ${t("questions")}` });
          dispatch({ type: 'SET_SELECTED_QUESTIONS', payload: [] });
          if (showingFeedback) {
            dispatch({ type: 'TOGGLE_FEEDBACK', payload: showingFeedback });
          }
        },
        onError: () => toast({ title: t("generationFailed"), description: t("failedToGenerate"), variant: "destructive" }),
        onSettled: () => dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: false }),
      }
    );
  };

  // Section management
  const removeSection = (sectionName: string) => {
    dispatch({ type: 'REMOVE_SECTION', payload: sectionName });
    toast({ title: t("sectionRemoved"), description: `"${sectionName}" ${t("hasBeenRemoved")}` });
  };

  const clearAllSections = () => {
    dispatch({ type: 'CLEAR_SECTIONS' });
    toast({ title: t("allSectionsCleared"), description: t("surveyReset") });
  };

  const saveSectionName = () => {
    if (state.editingSectionName === null || !state.editedSectionName.trim()) return;
    dispatch({ type: 'SAVE_SECTION_NAME' });
    toast({ title: "Nome sezione aggiornato", description: "Il nome della sezione è stato modificato con successo" });
  };

  // Export handlers
  const handleExportCSV = () => exportToCSV(sections, toast);
  const handleExportWord = () => exportToWord(sections, toast);
  const handleExportPDF = () => exportToPDF(sections, toast);

  const handleMoreQuestionsGenerate = async () => {
    if (!newModelDescription.trim()) {
      toast({ title: "Descrizione richiesta", description: "Inserisci una descrizione per il nuovo modello", variant: "destructive" });
      return;
    }
    dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: false });
    if (currentSectionForMore !== null) {
      await generateMoreQuestionsWithDescription(currentSectionForMore, newModelDescription);
    }
    dispatch({ type: 'RESET_MORE_QUESTIONS_FORM' });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" onClick={onBack}>← {t("backToHome")}</Button>
            <Button variant="outline" size="sm" onClick={() => setUiLanguage(uiLanguage === "en" ? "it" : "en")} className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              {uiLanguage === "en" ? "IT" : "EN"}
            </Button>
          </div>

          <div className="space-y-8">
            {/* Title */}
            <div>
              <h2 className="text-3xl font-bold mb-2">{t("createYourSurvey")}</h2>
              <p className="text-muted-foreground">{t("surveyDescription")}</p>
              {sections.length > 0 && (
                <p className="text-sm text-primary mt-2">
                  {sections.length} {sections.length === 1 ? t("section") : t("sections")} • {getAllQuestions(sections).length} {t("totalQuestions")}
                </p>
              )}
            </div>

            {/* Input Panel */}
            <SurveyInputPanel state={state} dispatch={dispatch} onGenerate={handleGenerate} onFileUpload={handleFileUpload} />

            {/* Survey Preview */}
            {sections.length > 0 && (
              <Card className="p-6 backdrop-blur-sm bg-card/50">
                <div className="space-y-6">
                  <SurveyPreviewHeader
                    isSaving={isSaving}
                    historyIndex={historyIndex}
                    historyLength={history.length}
                    onUndo={() => dispatch({ type: 'UNDO' })}
                    onRedo={() => dispatch({ type: 'REDO' })}
                    onPreview={() => dispatch({ type: 'SET_SHOW_PREVIEW', payload: true })}
                    onClearAll={clearAllSections}
                    onExportCSV={handleExportCSV}
                    onExportWord={handleExportWord}
                    onExportPDF={handleExportPDF}
                  />

                  <SectionList
                    state={state}
                    dispatch={dispatch}
                    onRemoveSection={removeSection}
                    onSaveSectionName={saveSectionName}
                    onCancelEditSectionName={() => dispatch({ type: 'CANCEL_EDIT_SECTION_NAME' })}
                    onGenerateMore={generateMoreQuestions}
                    onOpenMoreQuestionsDialog={(idx) => {
                      dispatch({ type: 'SET_CURRENT_SECTION_FOR_MORE', payload: idx });
                      dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: true });
                    }}
                    applyFeedbackToQuestion={applyFeedbackToQuestion}
                    applyFeedbackToMultipleQuestions={applyFeedbackToMultipleQuestions}
                  />

                  {/* Add New Section Button */}
                  <div className="mt-10 pt-10 border-t-2 border-border/60">
                    <Button variant="outline" className="w-full" onClick={() => dispatch({ type: 'SET_ADDING_SECTION_DIALOG', payload: true })}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("addNewSection")}
                    </Button>
                  </div>

                  {/* Export Info */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex gap-2 items-start">
                      <FileText className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Esporta su Google Forms</p>
                        <p className="text-sm text-muted-foreground">
                          Scarica il CSV e importalo in Google Forms. Le sezioni e le domande verranno organizzate automaticamente.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="flex justify-center mt-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="lg" className="text-lg font-semibold px-8 py-6">
                          <Download className="w-5 h-5 mr-2" />
                          Download
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background">
                        <DropdownMenuItem onClick={handleExportCSV}>
                          <FileText className="w-4 h-4 mr-2" />
                          CSV (Google Forms)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportWord}>
                          <FileText className="w-4 h-4 mr-2" />
                          Word (.doc)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF}>
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <AddSectionDialog open={addingSectionDialog} state={state} dispatch={dispatch} onGenerate={generateNewSection} />
        <MoreQuestionsDialog open={showMoreQuestionsDialog} state={state} dispatch={dispatch} onGenerate={handleMoreQuestionsGenerate} />
        <PreviewDialog
          open={showPreview}
          onOpenChange={(o) => dispatch({ type: 'SET_SHOW_PREVIEW', payload: o })}
          sections={sections}
          onPublish={() => {
            dispatch({ type: 'SET_SHOW_PREVIEW', payload: false });
            dispatch({ type: 'SET_SHOW_SAVE_DIALOG', payload: true });
          }}
        />
        <SaveSurveyDialog
          open={showSaveDialog}
          onOpenChange={(o) => dispatch({ type: 'SET_SHOW_SAVE_DIALOG', payload: o })}
          sections={sections}
          surveyLanguage={language}
          editingSurveyId={editingSurvey?.id}
        />
      </div>
    </ErrorBoundary>
  );
};
