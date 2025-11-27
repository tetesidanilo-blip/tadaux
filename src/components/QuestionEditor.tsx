import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Check, X, Languages, Plus, Download, Eye, Undo2, Redo2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { SaveSurveyDialog } from "./SaveSurveyDialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSurveyState, Question } from "@/hooks/useSurveyState";
import { useSurveyActions } from "@/hooks/useSurveyActions";
import { QuestionEditor } from "@/components/QuestionEditor";

interface SurveyGeneratorProps {
  onBack: () => void;
  editingSurvey?: any;
}

export const SurveyGenerator = ({ onBack, editingSurvey }: SurveyGeneratorProps) => {
  const { language: uiLanguage, setLanguage: setUiLanguage, t } = useLanguage();
  const [state, dispatch] = useSurveyState(editingSurvey);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Use the new custom hook for API actions
  const { generateSurvey, refineQuestion, generateMoreQuestions: generateMoreQuestionsApi } = useSurveyActions();
  
  // Destructure state for easier access
  const {
    description, sectionName, language, questionCount,
    generatingMore, isGenerating, sections, uploadedFile,
    currentDraftId, isSaving,
    editingSectionName, editedSectionName,
    addingSectionDialog, showSaveDialog, newSectionTitle, newSectionDescription,
    newSectionLanguage, newSectionQuestionCount, generatingNewSection,
    showPreview, showMoreQuestionsDialog, currentSectionForMore,
    newModelDescription, moreQuestionsCount,
    history, historyIndex
  } = state;

  // Debounced autosave
  useEffect(() => {
    if (sections.length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      dispatch({ type: 'SET_IS_SAVING', payload: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No user logged in, skipping autosave");
          return;
        }

        const shareToken = currentDraftId ? undefined : Math.random().toString(36).substring(2, 15);

        if (currentDraftId) {
          const { error } = await supabase
            .from('surveys')
            .update({
              sections: sections as any,
              language,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentDraftId);

          if (error) throw error;
        } else {
          const draftTitle = sections[0]?.name || 'Bozza senza titolo';
          
          const { data, error } = await supabase
            .from('surveys')
            .insert([{
              user_id: user.id,
              sections: sections as any,
              language,
              title: draftTitle,
              status: 'draft',
              share_token: shareToken!,
              is_active: false
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

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [sections, language, currentDraftId, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          dispatch({ type: 'UNDO' });
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          dispatch({ type: 'REDO' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, dispatch]);

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
          toast({
            title: t("fileUploaded"),
            description: `${file.name} ${t("fileReady")}`,
          });
        }
      } else {
        toast({
          title: t("invalidFileType"),
          description: t("uploadPDFOrWord"),
          variant: "destructive",
        });
      }
    }
  };

  const handleCSVImport = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: t("invalidCSV"),
          description: t("csvMustHaveData"),
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const sectionIndex = headers.indexOf('Section');
      const questionIndex = headers.indexOf('Question');
      const typeIndex = headers.indexOf('Type');
      const requiredIndex = headers.indexOf('Required');
      const optionStartIndex = headers.findIndex(h => h.startsWith('Option'));

      if (sectionIndex === -1 || questionIndex === -1 || typeIndex === -1) {
        toast({
          title: t("invalidCSVFormat"),
          description: t("csvMissingColumns"),
          variant: "destructive",
        });
        return;
      }

      const sectionMap = new Map<string, Question[]>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        
        const sectionName = values[sectionIndex] || "Sezione Importata";
        const questionText = values[questionIndex];
        const typeText = values[typeIndex];
        const required = values[requiredIndex]?.toLowerCase() === 'yes';

        let type = "short_answer";
        if (typeText.toLowerCase().includes("multiple choice")) type = "multiple_choice";
        else if (typeText.toLowerCase().includes("checkbox")) type = "checkbox";
        else if (typeText.toLowerCase().includes("paragraph")) type = "paragraph";
        else if (typeText.toLowerCase().includes("dropdown")) type = "dropdown";
        else if (typeText.toLowerCase().includes("short answer")) type = "short_answer";

        const options: string[] = [];
        if (optionStartIndex !== -1) {
          for (let j = optionStartIndex; j < values.length; j++) {
            if (values[j] && values[j].trim()) {
              options.push(values[j]);
            }
          }
        }

        const question: Question = {
          question: questionText,
          type,
          options: options.length > 0 ? options : undefined,
          required,
          section: sectionName
        };

        if (!sectionMap.has(sectionName)) {
          sectionMap.set(sectionName, []);
        }
        sectionMap.get(sectionName)!.push(question);
      }

      const importedSections: Array<{ name: string; questions: Question[] }> = Array.from(sectionMap.entries()).map(([name, questions]) => ({
        name,
        questions
      }));

      dispatch({ type: 'SET_SECTIONS', payload: [...sections, ...importedSections] });

      const totalQuestions = importedSections.reduce((sum, s) => sum + s.questions.length, 0);
      toast({
        title: t("csvImported"),
        description: `${importedSections.length} ${t("sections")} e ${totalQuestions} ${t("totalQuestions")} ${t("imported")}`,
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast({
        title: t("importFailed"),
        description: t("failedToImportCSV"),
        variant: "destructive",
      });
    }
  };

  const handleGenerate = () => {
    if (!description && !uploadedFile) {
      toast({
        title: t("inputRequired"),
        description: t("provideDescription"),
        variant: "destructive",
      });
      return;
    }

    if (!sectionName.trim()) {
      toast({
        title: t("sectionNameRequired"),
        description: t("provideSectionName"),
        variant: "destructive",
      });
      return;
    }

    dispatch({ type: 'SET_IS_GENERATING', payload: true });
    
    generateSurvey.mutate({
      description: uploadedFile ? `Document: ${uploadedFile.name}` : description,
      hasDocument: !!uploadedFile,
      language,
      questionCount: questionCount
    }, {
      onSuccess: (data: any) => {
        const newQuestions = data.questions.map((q: Question) => ({
          ...q,
          section: sectionName
        }));

        dispatch({ type: 'ADD_SECTION', payload: { name: sectionName, questions: newQuestions } });
        dispatch({ type: 'RESET_GENERATION_FORM' });

        toast({
          title: t("sectionAdded"),
          description: `${newQuestions.length} ${t("questionsAdded")} "${sectionName}"`,
        });
        dispatch({ type: 'SET_IS_GENERATING', payload: false });
      },
      onError: (error: any) => {
        console.error("Error generating survey:", error);
        toast({
          title: t("generationFailed"),
          description: t("failedToGenerate"),
          variant: "destructive",
        });
        dispatch({ type: 'SET_IS_GENERATING', payload: false });
      }
    });
  };

  const getAllQuestions = () => {
    return sections.flatMap(s => s.questions);
  };

  const exportToCSV = () => {
    const defaultFileName = sections[0]?.name || "questionario";
    const fileName = prompt("Inserisci il nome del file:", defaultFileName);
    if (!fileName) return;

    const allQuestions = getAllQuestions();
    
    const mapQuestionType = (type: string) => {
      switch (type) {
        case "multiple_choice": return "Multiple choice";
        case "checkbox": return "Checkboxes";
        case "short_answer": return "Short answer";
        case "paragraph": return "Paragraph";
        case "dropdown": return "Dropdown";
        default: return "Short answer";
      }
    };

    const maxOptions = Math.max(...allQuestions.map(q => q.options?.length || 0), 0);
    const optionHeaders = Array.from({ length: maxOptions }, (_, i) => `Option ${i + 1}`);
    const headers = ["Section", "Question", "Type", "Required", ...optionHeaders];
    
    const rows = allQuestions.map(q => {
      const row = [
        `"${(q.section || "").replace(/"/g, '""')}"`,
        `"${q.question.replace(/"/g, '""')}"`,
        mapQuestionType(q.type),
        q.required ? "Yes" : "No",
        ...(q.options || []).map(opt => `"${opt.replace(/"/g, '""')}"`),
      ];
      while (row.length < headers.length) {
        row.push("");
      }
      return row.join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t("csvExported"),
      description: t("importToGoogleForms"),
    });
  };

  const exportToWord = () => {
    const defaultFileName = sections[0]?.name || "questionario";
    const fileName = prompt("Inserisci il nome del file:", defaultFileName);
    if (!fileName) return;

    let content = `QUESTIONARIO GENERATO\n\n`;
    
    sections.forEach((section, sectionIndex) => {
      content += `${'='.repeat(50)}\n`;
      content += `SEZIONE: ${section.name}\n`;
      content += `${'='.repeat(50)}\n\n`;
      
      section.questions.forEach((q, qIndex) => {
        const questionNumber = sectionIndex * 100 + qIndex + 1;
        content += `${questionNumber}. ${q.question}`;
        
        const typeLabels: { [key: string]: string } = {
          'short_answer': 'Risposta breve',
          'paragraph': 'Paragrafo',
          'multiple_choice': 'Scelta multipla',
          'checkbox': 'Checkbox',
          'dropdown': 'Menu a tendina'
        };
        content += ` (${typeLabels[q.type] || q.type})`;
        
        if (q.required) {
          content += ` *OBBLIGATORIA`;
        }
        content += `\n`;
        
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt) => {
            const symbol = q.type === 'checkbox' ? '☐' : '○';
            content += `   ${symbol} ${opt}\n`;
          });
        }
        content += `\n`;
      });
      content += `\n`;
    });
    
    const blob = new Blob([content], { type: "application/msword;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.doc`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: t("exportSuccess") || "Export completato",
      description: "Documento Word scaricato con successo",
    });
  };

  const exportToPDF = async () => {
    const defaultFileName = sections[0]?.name || "questionario";
    const fileName = prompt("Inserisci il nome del file:", defaultFileName);
    if (!fileName) return;

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = 170;
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('QUESTIONARIO GENERATO', margin, yPosition);
      yPosition += 20;
      
      sections.forEach((section, sectionIndex) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const sectionLines = doc.splitTextToSize(`SEZIONE: ${section.name}`, maxWidth);
        sectionLines.forEach((line: string) => {
          doc.text(line, margin, yPosition);
          yPosition += 7;
        });
        yPosition += 8;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        section.questions.forEach((q, qIndex) => {
          const questionNumber = sectionIndex * 100 + qIndex + 1;
          
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = 20;
          }
          
          const typeLabels: { [key: string]: string } = {
            'short_answer': 'Risposta breve',
            'paragraph': 'Paragrafo',
            'multiple_choice': 'Scelta multipla',
            'checkbox': 'Checkbox',
            'dropdown': 'Menu a tendina'
          };
          
          doc.setFont('helvetica', 'bold');
          const questionText = `${questionNumber}. ${q.question} (${typeLabels[q.type] || q.type})${q.required ? ' *OBB.' : ''}`;
          const questionLines = doc.splitTextToSize(questionText, maxWidth);
          questionLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, margin, yPosition);
            yPosition += 6;
          });
          yPosition += 5;
          
          doc.setFont('helvetica', 'normal');
          if (q.options && q.options.length > 0) {
            q.options.forEach((opt) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              const symbol = q.type === 'checkbox' ? '[ ]' : '( )';
              const optionText = `   ${symbol} ${opt}`;
              const optionLines = doc.splitTextToSize(optionText, maxWidth - 5);
              optionLines.forEach((line: string) => {
                doc.text(line, margin + 8, yPosition);
                yPosition += 6;
              });
            });
          }
          
          yPosition += 3;
        });
        
        yPosition += 5;
      });
      
      doc.save(`${fileName}.pdf`);
      
      toast({
        title: t("exportSuccess") || "Export completato",
        description: "PDF scaricato con successo",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare il PDF",
        variant: "destructive",
      });
    }
  };

  const removeSection = (sectionName: string) => {
    dispatch({ type: 'REMOVE_SECTION', payload: sectionName });
    toast({
      title: t("sectionRemoved"),
      description: `"${sectionName}" ${t("hasBeenRemoved")}`,
    });
  };

  const clearAllSections = () => {
    dispatch({ type: 'CLEAR_SECTIONS' });
    toast({
      title: t("allSectionsCleared"),
      description: t("surveyReset"),
    });
  };

  const generateMoreQuestions = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    
    dispatch({ type: 'SET_GENERATING_MORE', payload: sectionIndex });
    
    generateMoreQuestionsApi.mutate({
      description: `Generate additional questions similar to the existing ones in section "${section.name}". Existing questions: ${section.questions.map(q => q.question).join(", ")}`,
      hasDocument: false,
      language 
    }, {
      onSuccess: (data: any) => {
        const newQuestions = data.questions.map((q: Question) => ({
          ...q,
          section: section.name
        }));

        dispatch({ type: 'ADD_QUESTIONS_TO_SECTION', payload: { sectionIndex, questions: newQuestions } });
        toast({
          title: t("questionsAdded"),
          description: `${newQuestions.length} ${t("newQuestionsAdded")}`,
        });
        dispatch({ type: 'SET_GENERATING_MORE', payload: null });
      },
      onError: (error: any) => {
        console.error("Error generating more questions:", error);
        toast({
          title: t("generationFailed"),
          description: t("failedToGenerate"),
          variant: "destructive",
        });
        dispatch({ type: 'SET_GENERATING_MORE', payload: null });
      }
    });
  };

  const generateMoreQuestionsWithDescription = (sectionIndex: number, description: string) => {
    const section = sections[sectionIndex];
    
    dispatch({ type: 'SET_GENERATING_MORE', payload: sectionIndex });
    
    generateMoreQuestionsApi.mutate({
      description: description,
      hasDocument: false,
      language,
      questionCount: moreQuestionsCount
    }, {
      onSuccess: (data: any) => {
        const newQuestions = data.questions.map((q: Question) => ({
          ...q,
          section: section.name
        }));

        dispatch({ type: 'ADD_QUESTIONS_TO_SECTION', payload: { sectionIndex, questions: newQuestions } });
        dispatch({ type: 'SET_MORE_QUESTIONS_COUNT', payload: null });

        toast({
          title: t("questionsAdded"),
          description: `${newQuestions.length} ${t("newQuestionsAdded")}`,
        });
        dispatch({ type: 'SET_GENERATING_MORE', payload: null });
      },
      onError: (error: any) => {
        console.error("Error generating more questions:", error);
        toast({
          title: t("generationFailed"),
          description: t("failedToGenerate"),
          variant: "destructive",
        });
        dispatch({ type: 'SET_GENERATING_MORE', payload: null });
      }
    });
  };

  const startEditingSectionName = (sectionIndex: number) => {
    dispatch({ type: 'START_EDIT_SECTION_NAME', payload: sectionIndex });
  };

  const saveSectionName = () => {
    if (editingSectionName === null || !editedSectionName.trim()) return;
    dispatch({ type: 'SAVE_SECTION_NAME' });
    toast({
      title: "Nome sezione aggiornato",
      description: "Il nome della sezione è stato modificato con successo",
    });
  };

  const cancelEditingSectionName = () => {
    dispatch({ type: 'CANCEL_EDIT_SECTION_NAME' });
  };

  const applyFeedbackToQuestion = (sectionIndex: number, questionIndex: number) => {
    const question = sections[sectionIndex].questions[questionIndex];
    const feedback = question.feedback;

    if (!feedback) {
      toast({
        title: t("noFeedback"),
        description: t("noFeedbackDesc"),
        variant: "destructive",
      });
      return;
    }

    dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: true });
    
    refineQuestion.mutate({
      refineQuestion: {
        question: question.question,
        feedback: feedback,
        type: question.type,
        options: question.options
      },
      language 
    }, {
      onSuccess: (data: any) => {
        const refinedQuestion = data.questions[0];
        dispatch({ type: 'UPDATE_QUESTION_WITH_FEEDBACK', payload: { sectionIndex, questionIndex, question: refinedQuestion } });
        toast({
          title: t("feedbackApplied"),
          description: t("feedbackAppliedDesc"),
        });
        dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: false });
      },
      onError: (error: any) => {
        console.error("Error applying feedback:", error);
        toast({
          title: t("generationFailed"),
          description: t("failedToGenerate"),
          variant: "destructive",
        });
        dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: false });
      }
    });
  };

  const applyFeedbackToMultipleQuestions = (
    questions: Array<{sectionIndex: number, questionIndex: number}>,
    feedback: string
  ) => {
    dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: true });
    
    // Process requests sequentially to avoid overwhelming the server/API
    // In a real app, you might want to batch these on the backend
    const processRequests = async () => {
      let completed = 0;
      
      for (const {sectionIndex, questionIndex} of questions) {
        try {
          const question = sections[sectionIndex].questions[questionIndex];
          
          const result = await refineQuestion.mutateAsync({
            refineQuestion: {
              question: question.question,
              feedback: feedback,
              type: question.type,
              options: question.options
            },
            language 
          });
          
          const refinedQuestion = result.questions[0];
          dispatch({ type: 'UPDATE_QUESTION_WITH_FEEDBACK', payload: { sectionIndex, questionIndex, question: refinedQuestion } });
          completed++;
        } catch (error) {
          console.error(`Error applying feedback to question ${sectionIndex}-${questionIndex}:`, error);
        }
      }
      
      toast({
        title: t("feedbackApplied"),
        description: `${completed} ${t("questionsUpdated")}`,
      });
      
      dispatch({ type: 'SET_SELECTED_QUESTIONS', payload: [] });
      // If showing feedback for a specific question, toggle it (close it)
      // Note: showingFeedback comes from state, but we can check if we need to close it
      if (state.showingFeedback) {
        dispatch({ type: 'TOGGLE_FEEDBACK', payload: state.showingFeedback });
      }
      
      dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: false });
    };
    
    processRequests();
  };

  const generateNewSection = () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: t("sectionNameRequired"),
        description: t("provideSectionName"),
        variant: "destructive",
      });
      return;
    }

    if (!newSectionDescription.trim()) {
      toast({
        title: t("inputRequired"),
        description: t("provideDescription"),
        variant: "destructive",
      });
      return;
    }

    dispatch({ type: 'SET_GENERATING_NEW_SECTION', payload: true });
    
    generateSurvey.mutate({
      description: newSectionDescription,
      hasDocument: false,
      language: newSectionLanguage,
      questionCount: newSectionQuestionCount
    }, {
      onSuccess: (data: any) => {
        const newQuestions = data.questions.map((q: Question) => ({
          ...q,
          section: newSectionTitle
        }));

        dispatch({ type: 'ADD_SECTION', payload: { name: newSectionTitle, questions: newQuestions } });
        dispatch({ type: 'RESET_NEW_SECTION_FORM' });

        toast({
          title: t("sectionAdded"),
          description: `${newQuestions.length} ${t("questionsAdded")} "${newSectionTitle}"`,
        });
        dispatch({ type: 'SET_GENERATING_NEW_SECTION', payload: false });
      },
      onError: (error: any) => {
        console.error("Error generating new section:", error);
        toast({
          title: t("generationFailed"),
          description: t("failedToGenerate"),
          variant: "destructive",
        });
        dispatch({ type: 'SET_GENERATING_NEW_SECTION', payload: false });
      }
    });
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack}>
            ← {t("backToHome")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUiLanguage(uiLanguage === "en" ? "it" : "en")}
            className="flex items-center gap-2"
          >
            <Languages className="w-4 h-4" />
            {uiLanguage === "en" ? "IT" : "EN"}
          </Button>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">{t("createYourSurvey")}</h2>
            <p className="text-muted-foreground">
              {t("surveyDescription")}
            </p>
            {sections.length > 0 && (
              <p className="text-sm text-primary mt-2">
                {sections.length} {sections.length === 1 ? t("section") : t("sections")} • {getAllQuestions().length} {t("totalQuestions")}
              </p>
            )}
          </div>

          <Card className="p-6 backdrop-blur-sm bg-card/50">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("surveyLanguage")} *
                </label>
                <select
                  value={language}
                  onChange={(e) => dispatch({ type: 'SET_LANGUAGE', payload: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  disabled={isGenerating}
                >
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="nl">Nederlands</option>
                  <option value="pl">Polski</option>
                  <option value="ru">Русский</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("sectionName")} *
                </label>
                <Input
                  placeholder={t("sectionNamePlaceholder")}
                  value={sectionName}
                  onChange={(e) => dispatch({ type: 'SET_SECTION_NAME', payload: e.target.value })}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("questionDescription")}
                </label>
                <Textarea
                  placeholder={t("questionDescriptionPlaceholder")}
                  value={description}
                  onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
                  className="min-h-32"
                  disabled={isGenerating}
                />
              </div>

              <div className="relative">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("uploadDocument")}
                </label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={isGenerating}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadedFile ? uploadedFile.name : t("chooseFile")}
                  </Button>
                  {uploadedFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch({ type: 'SET_UPLOADED_FILE', payload: null })}
                    >
                      {t("clear")}
                    </Button>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("supportsFiles")} (PDF, Word, CSV)
                </p>
              </div>

              <div>
                <Label htmlFor="questionCount">Numero di domande</Label>
                <Select 
                  value={questionCount === null ? "auto" : questionCount.toString()} 
                  onValueChange={(value) => dispatch({ type: 'SET_QUESTION_COUNT', payload: value === "auto" ? null : parseInt(value) })}
                >
                  <SelectTrigger id="questionCount">
                    <SelectValue placeholder="-- Automatico (AI decide)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">-- Automatico (AI decide)</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'domanda' : 'domande'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || (!description && !uploadedFile) || !sectionName.trim()}
                className="w-full"
                size="lg"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: 'var(--shadow-elegant)',
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  sections.length > 0 ? t("addNewSection") : t("generateFirstSection")
                )}
              </Button>
            </div>
          </Card>

          {sections.length > 0 && (
            <Card className="p-6 backdrop-blur-sm bg-card/50">
              <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold">{t("yourSurvey")}</h3>
                      {isSaving && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Salvataggio...
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => dispatch({ type: 'UNDO' })}
                        disabled={historyIndex <= 0}
                        title="Annulla (Ctrl+Z)"
                      >
                        <Undo2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => dispatch({ type: 'REDO' })}
                        disabled={historyIndex >= history.length - 1}
                        title="Ripeti (Ctrl+Y)"
                      >
                        <Redo2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => dispatch({ type: 'SET_SHOW_PREVIEW', payload: true })}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background">
                        <DropdownMenuItem onClick={exportToCSV}>
                          <FileText className="w-4 h-4 mr-2" />
                          CSV (Google Forms)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToWord}>
                          <FileText className="w-4 h-4 mr-2" />
                          Word (.doc)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToPDF}>
                          <FileText className="w-4 h-4 mr-2" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      onClick={clearAllSections}
                    >
                      {t("clearAll")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        {editingSectionName === sectionIndex ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editedSectionName}
                              onChange={(e) => dispatch({ type: 'SET_EDITED_SECTION_NAME', payload: e.target.value })}
                              className="text-xl font-bold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveSectionName();
                                if (e.key === 'Escape') cancelEditingSectionName();
                              }}
                            />
                            <Button variant="ghost" size="sm" onClick={saveSectionName}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEditingSectionName}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <h4 
                            className="text-xl font-bold text-primary cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                            onClick={() => startEditingSectionName(sectionIndex)}
                            title="Clicca per modificare il nome"
                          >
                            {section.name}
                          </h4>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(section.name)}
                        >
                          {t("removeSection")}
                        </Button>
                      </div>
                      
                      {section.questions.map((question, questionIndex) => (
                        <QuestionEditor
                          key={questionIndex}
                          question={question}
                          sectionIndex={sectionIndex}
                          questionIndex={questionIndex}
                          state={state}
                          dispatch={dispatch}
                          applyFeedbackToQuestion={applyFeedbackToQuestion}
                          applyFeedbackToMultipleQuestions={applyFeedbackToMultipleQuestions}
                        />
                      ))}
                      
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateMoreQuestions(sectionIndex)}
                          disabled={generatingMore === sectionIndex}
                          className="w-full"
                        >
                          {generatingMore === sectionIndex ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t("generating")}
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Continua con modello precedente
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            dispatch({ type: 'SET_CURRENT_SECTION_FOR_MORE', payload: sectionIndex });
                            dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: true });
                          }}
                          disabled={generatingMore === sectionIndex}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nuovo modello/argomento
                        </Button>
                      </div>
                    </div>
                  ))}
                 </div>

                <div className="mt-10 pt-10 border-t-2 border-border/60">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => dispatch({ type: 'SET_ADDING_SECTION_DIALOG', payload: true })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("addNewSection")}
                  </Button>
                </div>

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

                <div className="flex justify-center mt-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="lg" className="text-lg font-semibold px-8 py-6">
                        <Download className="w-5 h-5 mr-2" />
                        Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-background">
                      <DropdownMenuItem onClick={exportToCSV}>
                        <FileText className="w-4 h-4 mr-2" />
                        CSV (Google Forms)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToWord}>
                        <FileText className="w-4 h-4 mr-2" />
                        Word (.doc)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToPDF}>
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

      <Dialog open={addingSectionDialog} onOpenChange={(open) => dispatch({ type: 'SET_ADDING_SECTION_DIALOG', payload: open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addNewSection")}</DialogTitle>
            <DialogDescription>
              {t("newSectionDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("surveyLanguage")} *
              </label>
              <select
                value={newSectionLanguage}
                onChange={(e) => dispatch({ type: 'SET_NEW_SECTION_LANGUAGE', payload: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                disabled={generatingNewSection}
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="pt">Português</option>
                <option value="nl">Nederlands</option>
                <option value="pl">Polski</option>
                <option value="ru">Русский</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t("sectionName")} *
              </label>
              <Input
                placeholder={t("sectionNamePlaceholder")}
                value={newSectionTitle}
                onChange={(e) => dispatch({ type: 'SET_NEW_SECTION_TITLE', payload: e.target.value })}
                disabled={generatingNewSection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t("questionDescription")} *
              </label>
              <Textarea
                placeholder={t("questionDescriptionPlaceholder")}
                value={newSectionDescription}
                onChange={(e) => dispatch({ type: 'SET_NEW_SECTION_DESCRIPTION', payload: e.target.value })}
                className="min-h-24"
                disabled={generatingNewSection}
              />
            </div>

            <div>
              <Label htmlFor="newSectionQuestionCount">Numero di domande</Label>
              <Select 
                value={newSectionQuestionCount === null ? "auto" : newSectionQuestionCount.toString()} 
                onValueChange={(value) => dispatch({ type: 'SET_NEW_SECTION_QUESTION_COUNT', payload: value === "auto" ? null : parseInt(value) })}
              >
                <SelectTrigger id="newSectionQuestionCount">
                  <SelectValue placeholder="-- Automatico (AI decide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">-- Automatico (AI decide)</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'domanda' : 'domande'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  dispatch({ type: 'RESET_NEW_SECTION_FORM' });
                }}
                disabled={generatingNewSection}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={generateNewSection}
                disabled={generatingNewSection}
              >
                {generatingNewSection ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("generateSection")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoreQuestionsDialog} onOpenChange={(open) => dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuovo Modello/Argomento</DialogTitle>
            <DialogDescription>
              Inserisci le indicazioni per creare domande su un nuovo modello o argomento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Descrivi il nuovo modello o argomento
              </label>
              <Textarea
                placeholder="Es: Crea domande sul modello di leadership trasformazionale, sui principi della fisica quantistica, etc..."
                value={newModelDescription}
                onChange={(e) => dispatch({ type: 'SET_NEW_MODEL_DESCRIPTION', payload: e.target.value })}
                className="min-h-32"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="moreQuestionsCount">Numero di domande</Label>
              <Select 
                value={moreQuestionsCount === null ? "auto" : moreQuestionsCount.toString()} 
                onValueChange={(value) => dispatch({ type: 'SET_MORE_QUESTIONS_COUNT', payload: value === "auto" ? null : parseInt(value) })}
              >
                <SelectTrigger id="moreQuestionsCount">
                  <SelectValue placeholder="-- Automatico (AI decide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">-- Automatico (AI decide)</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'domanda' : 'domande'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: false });
                  dispatch({ type: 'RESET_MORE_QUESTIONS_FORM' });
                }}
              >
                Annulla
              </Button>
              <Button
                onClick={async () => {
                  if (!newModelDescription.trim()) {
                    toast({
                      title: "Descrizione richiesta",
                      description: "Inserisci una descrizione per il nuovo modello",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: false });
                  
                  if (currentSectionForMore !== null) {
                    await generateMoreQuestionsWithDescription(currentSectionForMore, newModelDescription);
                  }
                  
                  dispatch({ type: 'RESET_MORE_QUESTIONS_FORM' });
                }}
                disabled={!newModelDescription.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Genera Domande
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={(open) => dispatch({ type: 'SET_SHOW_PREVIEW', payload: open })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("surveyPreview")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-4">
                <h3 className="text-xl font-semibold">{section.name}</h3>
                {section.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">{questionIndex + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium">{question.question}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {question.type === "multiple_choice" && "Scelta multipla"}
                          {question.type === "checkbox" && "Caselle di controllo"}
                          {question.type === "short_answer" && "Risposta breve"}
                          {question.type === "paragraph" && "Paragrafo"}
                          {question.type === "dropdown" && "Menu a tendina"}
                        </p>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                {question.type === "multiple_choice" ? (
                                  <div className="w-4 h-4 rounded-full border-2" />
                                ) : (
                                  <div className="w-4 h-4 rounded border-2" />
                                )}
                                <span className="text-sm">{option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'SET_SHOW_PREVIEW', payload: false })}
            >
              Chiudi
            </Button>
            <Button
              onClick={() => {
                dispatch({ type: 'SET_SHOW_PREVIEW', payload: false });
                dispatch({ type: 'SET_SHOW_SAVE_DIALOG', payload: true });
              }}
            >
              Pubblica
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SaveSurveyDialog 
        open={showSaveDialog}
        onOpenChange={(open) => dispatch({ type: 'SET_SHOW_SAVE_DIALOG', payload: open })}
        sections={sections}
        surveyLanguage={language}
        editingSurveyId={editingSurvey?.id}
      />
    </div>
  );
};
