import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Edit2, Trash2, Check, X, Languages, MessageSquare, Plus, CheckCircle2, Circle, Download, Eye, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { SaveSurveyDialog } from "./SaveSurveyDialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSurveyState, Question } from "@/hooks/useSurveyState";

interface SurveyGeneratorProps {
  onBack: () => void;
  editingSurvey?: any;
}

export const SurveyGenerator = ({ onBack, editingSurvey }: SurveyGeneratorProps) => {
  const { language: uiLanguage, setLanguage: setUiLanguage, t } = useLanguage();
  const [state, dispatch] = useSurveyState(editingSurvey);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Destructure state for easier access
  const {
    description, sectionName, language, questionCount,
    generatingMore, isGenerating, sections, uploadedFile,
    currentDraftId, isSaving, editingQuestion, editedQuestion,
    showingFeedback, selectedQuestions, applyingFeedback,
    addingSectionManually, newSectionName, addingSectionDialog,
    showSaveDialog, newSectionTitle, newSectionDescription,
    newSectionLanguage, newSectionQuestionCount, generatingNewSection,
    showPreview, showMoreQuestionsDialog, currentSectionForMore,
    newModelDescription, moreQuestionsCount, editingSectionName,
    editedSectionName, showSelectQuestionsDialog
  } = state;

  // FIXED: Debounced autosave with proper race condition handling
  useEffect(() => {
    if (sections.length === 0) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce: wait 1 second after last change before saving
    saveTimeoutRef.current = setTimeout(async () => {
      dispatch({ type: 'SET_IS_SAVING', payload: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No user logged in, skipping autosave");
          return;
        }

        // Generate a share token if this is a new draft
        const shareToken = currentDraftId ? undefined : Math.random().toString(36).substring(2, 15);

        if (currentDraftId) {
          // Update existing draft
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
          // Create new draft - use first section name as title
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
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [sections, language, currentDraftId, dispatch]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword" ||
          file.type === "text/csv") {
        
        // Se è un CSV, lo processiamo immediatamente
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

      // Parsa l'header
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

      // Raggruppa domande per sezione
      const sectionMap = new Map<string, Question[]>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        
        const sectionName = values[sectionIndex] || "Sezione Importata";
        const questionText = values[questionIndex];
        const typeText = values[typeIndex];
        const required = values[requiredIndex]?.toLowerCase() === 'yes';

        // Mappa il tipo da Google Forms al nostro formato
        let type = "short_answer";
        if (typeText.toLowerCase().includes("multiple choice")) type = "multiple_choice";
        else if (typeText.toLowerCase().includes("checkbox")) type = "checkbox";
        else if (typeText.toLowerCase().includes("paragraph")) type = "paragraph";
        else if (typeText.toLowerCase().includes("dropdown")) type = "dropdown";
        else if (typeText.toLowerCase().includes("short answer")) type = "short_answer";

        // Estrai le opzioni
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

      // Converti la mappa in array di sezioni
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

  const handleGenerate = async () => {
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
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: uploadedFile ? `Document: ${uploadedFile.name}` : description,
          hasDocument: !!uploadedFile,
          language,
          questionCount: questionCount
        },
      });

      if (error) throw error;

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
    } catch (error) {
      console.error("Error generating survey:", error);
      toast({
        title: t("generationFailed"),
        description: t("failedToGenerate"),
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_IS_GENERATING', payload: false });
    }
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return "○";
      case "checkbox":
        return "☐";
      case "short_answer":
        return "___";
      case "paragraph":
        return "¶";
      case "dropdown":
        return "▼";
      default:
        return "?";
    }
  };

  const getAllQuestions = () => {
    return sections.flatMap(s => s.questions);
  };

  const exportToCSV = () => {
    const defaultFileName = sections[0]?.name || "questionario";
    const fileName = prompt("Inserisci il nome del file:", defaultFileName);
    if (!fileName) return; // User cancelled

    const allQuestions = getAllQuestions();
    
    // Map question types to Google Forms format
    const mapQuestionType = (type: string) => {
      switch (type) {
        case "multiple_choice":
          return "Multiple choice";
        case "checkbox":
          return "Checkboxes";
        case "short_answer":
          return "Short answer";
        case "paragraph":
          return "Paragraph";
        case "dropdown":
          return "Dropdown";
        default:
          return "Short answer";
      }
    };

    // Create CSV header with Section column
    const maxOptions = Math.max(...allQuestions.map(q => q.options?.length || 0), 0);
    const optionHeaders = Array.from({ length: maxOptions }, (_, i) => `Option ${i + 1}`);
    const headers = ["Section", "Question", "Type", "Required", ...optionHeaders];
    
    // Create CSV rows
    const rows = allQuestions.map(q => {
      const row = [
        `"${(q.section || "").replace(/"/g, '""')}"`,
        `"${q.question.replace(/"/g, '""')}"`,
        mapQuestionType(q.type),
        q.required ? "Yes" : "No",
        ...(q.options || []).map(opt => `"${opt.replace(/"/g, '""')}"`),
      ];
      // Pad with empty strings if fewer options than max
      while (row.length < headers.length) {
        row.push("");
      }
      return row.join(",");
    });

    // Combine headers and rows
    const csv = [headers.join(","), ...rows].join("\n");

    // Create and download the file
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
    if (!fileName) return; // User cancelled

    let content = `QUESTIONARIO GENERATO\n\n`;
    
    sections.forEach((section, sectionIndex) => {
      content += `${'='.repeat(50)}\n`;
      content += `SEZIONE: ${section.name}\n`;
      content += `${'='.repeat(50)}\n\n`;
      
      section.questions.forEach((q, qIndex) => {
        const questionNumber = sectionIndex * 100 + qIndex + 1;
        content += `${questionNumber}. ${q.question}`;
        
        // Add question type
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
        
        // Add options if present
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
    
    // Create and download DOC file
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
    if (!fileName) return; // User cancelled

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = 170;
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('QUESTIONARIO GENERATO', margin, yPosition);
      yPosition += 20;
      
      sections.forEach((section, sectionIndex) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Section title
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
          
          // Check if we need a new page
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Question text
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
          
          // Options
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
      
      // Save PDF
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

  const startEditingQuestion = (sectionIndex: number, questionIndex: number) => {
    dispatch({ type: 'START_EDIT_QUESTION', payload: { sectionIndex, questionIndex } });
  };

  const cancelEditing = () => {
    dispatch({ type: 'CANCEL_EDITING' });
  };

  const saveEditedQuestion = () => {
    if (!editingQuestion || !editedQuestion) return;

    dispatch({ type: 'SAVE_EDITED_QUESTION' });

    toast({
      title: t("questionUpdated"),
      description: t("changesSaved"),
    });
  };

  const generateMoreQuestions = async (sectionIndex: number) => {
    const section = sections[sectionIndex];
    
    dispatch({ type: 'SET_GENERATING_MORE', payload: sectionIndex });
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: `Generate additional questions similar to the existing ones in section "${section.name}". Existing questions: ${section.questions.map(q => q.question).join(", ")}`,
          hasDocument: false,
          language 
        },
      });

      if (error) throw error;

      const newQuestions = data.questions.map((q: Question) => ({
        ...q,
        section: section.name
      }));

      dispatch({ type: 'ADD_QUESTIONS_TO_SECTION', payload: { sectionIndex, questions: newQuestions } });

      toast({
        title: t("questionsAdded"),
        description: `${newQuestions.length} ${t("newQuestionsAdded")}`,
      });
    } catch (error) {
      console.error("Error generating more questions:", error);
      toast({
        title: t("generationFailed"),
        description: t("failedToGenerate"),
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_GENERATING_MORE', payload: null });
    }
  };

  const generateMoreQuestionsWithDescription = async (sectionIndex: number, description: string) => {
    const section = sections[sectionIndex];
    
    dispatch({ type: 'SET_GENERATING_MORE', payload: sectionIndex });
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: description,
          hasDocument: false,
          language,
          questionCount: moreQuestionsCount
        },
      });

      if (error) throw error;

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
    } catch (error) {
      console.error("Error generating more questions:", error);
      toast({
        title: t("generationFailed"),
        description: t("failedToGenerate"),
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_GENERATING_MORE', payload: null });
    }
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

  const deleteQuestion = (sectionIndex: number, questionIndex: number) => {
    dispatch({ type: 'DELETE_QUESTION', payload: { sectionIndex, questionIndex } });

    toast({
      title: t("questionDeleted"),
      description: t("questionRemoved"),
    });
  };

  const updateEditedQuestionOptions = (index: number, value: string) => {
    dispatch({ type: 'UPDATE_EDITED_QUESTION_OPTION', payload: { index, value } });
  };

  const addOptionToEditedQuestion = () => {
    dispatch({ type: 'ADD_EDITED_QUESTION_OPTION' });
  };

  const removeOptionFromEditedQuestion = (index: number) => {
    dispatch({ type: 'REMOVE_EDITED_QUESTION_OPTION', payload: index });
  };

  const toggleFeedback = (sectionIndex: number, questionIndex: number) => {
    dispatch({ type: 'TOGGLE_FEEDBACK', payload: { sectionIndex, questionIndex } });
  };

  const saveFeedback = (sectionIndex: number, questionIndex: number, feedback: string) => {
    dispatch({ type: 'SAVE_FEEDBACK', payload: { sectionIndex, questionIndex, feedback } });

    toast({
      title: t("feedbackSaved"),
      description: t("feedbackSavedDesc"),
    });
  };

  const applyFeedbackToQuestion = async (sectionIndex: number, questionIndex: number) => {
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
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          refineQuestion: {
            question: question.question,
            feedback: feedback,
            type: question.type,
            options: question.options
          },
          language 
        },
      });

      if (error) throw error;

      const refinedQuestion = data.questions[0];

      dispatch({ type: 'UPDATE_QUESTION_WITH_FEEDBACK', payload: { sectionIndex, questionIndex, question: refinedQuestion } });

      toast({
        title: t("feedbackApplied"),
        description: t("feedbackAppliedDesc"),
      });
    } catch (error) {
      console.error("Error applying feedback:", error);
      toast({
        title: t("generationFailed"),
        description: t("failedToGenerate"),
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: false });
    }
  };

  const applyFeedbackToMultipleQuestions = async (
    questions: Array<{sectionIndex: number, questionIndex: number}>,
    feedback: string
  ) => {
    dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: true });
    let completed = 0;

    try {
      for (const {sectionIndex, questionIndex} of questions) {
        try {
          const question = sections[sectionIndex].questions[questionIndex];
          
          const { data, error } = await supabase.functions.invoke("generate-survey", {
            body: { 
              refineQuestion: {
                question: question.question,
                feedback: feedback,
                type: question.type,
                options: question.options
              },
              language 
            },
          });

          if (error) throw error;

          const refinedQuestion = data.questions[0];

          dispatch({ type: 'UPDATE_QUESTION_WITH_FEEDBACK', payload: { sectionIndex, questionIndex, question: refinedQuestion } });

          completed++;
        } catch (error) {
          console.error(`Error applying feedback to question ${sectionIndex}-${questionIndex}:`, error);
          toast({
            title: t("generationFailed"),
            description: `Errore sulla domanda ${questionIndex + 1}`,
            variant: "destructive",
          });
        }
      }

      toast({
        title: t("feedbackApplied"),
        description: `${completed} ${t("questionsUpdated")}`,
      });

      dispatch({ type: 'SET_SELECTED_QUESTIONS', payload: [] });
      if (showingFeedback) {
        toggleFeedback(showingFeedback.sectionIndex, showingFeedback.questionIndex);
      }
    } catch (error) {
      console.error("Error applying feedback to multiple questions:", error);
      toast({
        title: t("generationFailed"),
        description: t("failedToGenerate"),
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_APPLYING_FEEDBACK', payload: false });
    }
  };

  const addManualSection = () => {
    if (!newSectionName.trim()) {
      toast({
        title: t("sectionNameRequired"),
        description: t("provideSectionName"),
        variant: "destructive",
      });
      return;
    }

    dispatch({ type: 'ADD_SECTION', payload: { name: newSectionName, questions: [] } });
    dispatch({ type: 'SET_NEW_SECTION_NAME', payload: "" });
    dispatch({ type: 'SET_ADDING_SECTION_MANUALLY', payload: false });

    toast({
      title: t("sectionAdded"),
      description: `"${newSectionName}" ${t("hasBeenCreated")}`,
    });
  };

  const generateNewSection = async () => {
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
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: newSectionDescription,
          hasDocument: false,
          language: newSectionLanguage,
          questionCount: newSectionQuestionCount
        },
      });

      if (error) throw error;

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
    } catch (error) {
      console.error("Error generating new section:", error);
      toast({
        title: t("generationFailed"),
        description: t("failedToGenerate"),
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_GENERATING_NEW_SECTION', payload: false });
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
          >
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveSectionName}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingSectionName}
                            >
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
                      
                      {section.questions.map((question, questionIndex) => {
                        const isEditing = editingQuestion?.sectionIndex === sectionIndex && 
                                         editingQuestion?.questionIndex === questionIndex;
                        
                        return (
                          <Card 
                            key={questionIndex} 
                            className="p-4 border-l-4 border-l-primary transition-all"
                          >
                            {isEditing && editedQuestion ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">{t("question")}</label>
                                  <Input
                                    value={editedQuestion.question}
                                    onChange={(e) => dispatch({ type: 'UPDATE_EDITED_QUESTION', payload: { question: e.target.value } })}
                                    className="mt-1"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">{t("type")}</label>
                                    <select
                                      value={editedQuestion.type}
                                      onChange={(e) => dispatch({ type: 'UPDATE_EDITED_QUESTION', payload: { type: e.target.value } })}
                                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                                    >
                                      <option value="multiple_choice">{t("multipleChoice")}</option>
                                      <option value="checkbox">{t("checkboxes")}</option>
                                      <option value="short_answer">{t("shortAnswer")}</option>
                                      <option value="paragraph">{t("paragraph")}</option>
                                      <option value="dropdown">{t("dropdown")}</option>
                                    </select>
                                  </div>

                                  <div className="flex items-center gap-2 pt-6">
                                    <input
                                      type="checkbox"
                                      checked={editedQuestion.required}
                                      onChange={(e) => dispatch({ type: 'UPDATE_EDITED_QUESTION', payload: { required: e.target.checked } })}
                                      className="rounded"
                                    />
                                    <label className="text-sm font-medium">{t("required")}</label>
                                  </div>
                                </div>

                                {(editedQuestion.type === "multiple_choice" || 
                                  editedQuestion.type === "checkbox" || 
                                  editedQuestion.type === "dropdown") && (
                                  <div>
                                    <label className="text-sm font-medium">{t("options")}</label>
                                    <div className="space-y-2 mt-2">
                                      {editedQuestion.options?.map((option, idx) => (
                                        <div key={idx} className="flex gap-2">
                                          <Input
                                            value={option}
                                            onChange={(e) => updateEditedQuestionOptions(idx, e.target.value)}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOptionFromEditedQuestion(idx)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addOptionToEditedQuestion}
                                      >
                                        {t("addOption")}
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                  <Button variant="ghost" size="sm" onClick={cancelEditing}>
                                    <X className="w-4 h-4 mr-1" />
                                    {t("cancel")}
                                  </Button>
                                  <Button variant="default" size="sm" onClick={saveEditedQuestion}>
                                    <Check className="w-4 h-4 mr-1" />
                                    {t("save")}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3 flex-1">
                                        <h5 className="font-medium text-base flex-1">
                                          {questionIndex + 1}. {question.question}
                                          {question.required && (
                                            <span className="text-destructive ml-1">*</span>
                                          )}
                                        </h5>
                                      </div>
                                      <div className="flex gap-2 items-center">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => startEditingQuestion(sectionIndex, questionIndex)}
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => deleteQuestion(sectionIndex, questionIndex)}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                      </div>
                                    </div>

                                    {/* Google Forms Style Preview */}
                                    <div className="ml-11">
                                      {question.type === "multiple_choice" && question.options && (
                                        <div className="space-y-2">
                                          {question.options.map((option, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                                              <span className="text-sm">{option}</span>
                                            </div>
                  ))}
                 </div>
                                      )}

                                      {question.type === "checkbox" && question.options && (
                                        <div className="space-y-2">
                                          {question.options.map((option, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                              <div className="w-4 h-4 border-2 border-muted-foreground rounded" />
                                              <span className="text-sm">{option}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {question.type === "short_answer" && (
                                        <div className="border-b border-muted-foreground/30 pb-2 w-full max-w-md">
                                          <span className="text-sm text-muted-foreground">La tua risposta</span>
                                        </div>
                                      )}

                                      {question.type === "paragraph" && (
                                        <div className="border border-muted-foreground/30 rounded p-3 w-full">
                                          <span className="text-sm text-muted-foreground">La tua risposta</span>
                                        </div>
                                      )}

                                      {question.type === "dropdown" && question.options && (
                                        <div className="border border-muted-foreground/30 rounded px-3 py-2 w-full max-w-md flex items-center justify-between">
                                          <span className="text-sm text-muted-foreground">Scegli</span>
                                          <span className="text-muted-foreground">▼</span>
                                        </div>
                                      )}
                                      
                                      {/* Question Type & Feedback Buttons - Below Question */}
                                      <div className="mt-3 pt-3 border-t border-muted-foreground/20 flex items-center gap-3">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="outline" size="sm" className="gap-2">
                                                {getQuestionIcon(question.type)}
                                                <span className="text-sm">
                                                  {question.type === 'multiple_choice' && 'Scelta multipla'}
                                                  {question.type === 'checkbox' && 'Caselle di controllo'}
                                                  {question.type === 'short_answer' && 'Risposta breve'}
                                                  {question.type === 'paragraph' && 'Paragrafo'}
                                                  {question.type === 'dropdown' && 'Menu a tendina'}
                                                </span>
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-background">
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  dispatch({ 
                                                    type: 'UPDATE_QUESTION_TYPE', 
                                                    payload: { 
                                                      sectionIndex, 
                                                      questionIndex, 
                                                      type: 'multiple_choice', 
                                                      options: sections[sectionIndex].questions[questionIndex].options || ['Opzione 1', 'Opzione 2'] 
                                                    } 
                                                  });
                                                }}
                                              >
                                                <span className="text-xl mr-2">○</span> Scelta multipla
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  dispatch({ 
                                                    type: 'UPDATE_QUESTION_TYPE', 
                                                    payload: { 
                                                      sectionIndex, 
                                                      questionIndex, 
                                                      type: 'checkbox', 
                                                      options: sections[sectionIndex].questions[questionIndex].options || ['Opzione 1', 'Opzione 2'] 
                                                    } 
                                                  });
                                                }}
                                              >
                                                <span className="text-xl mr-2">☐</span> Caselle di controllo
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  dispatch({ 
                                                    type: 'UPDATE_QUESTION_TYPE', 
                                                    payload: { 
                                                      sectionIndex, 
                                                      questionIndex, 
                                                      type: 'short_answer', 
                                                      options: undefined 
                                                    } 
                                                  });
                                                }}
                                              >
                                                <span className="text-xl mr-2">___</span> Risposta breve
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  dispatch({ 
                                                    type: 'UPDATE_QUESTION_TYPE', 
                                                    payload: { 
                                                      sectionIndex, 
                                                      questionIndex, 
                                                      type: 'paragraph', 
                                                      options: undefined 
                                                    } 
                                                  });
                                                }}
                                              >
                                                <span className="text-xl mr-2">¶</span> Paragrafo
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  dispatch({ 
                                                    type: 'UPDATE_QUESTION_TYPE', 
                                                    payload: { 
                                                      sectionIndex, 
                                                      questionIndex, 
                                                      type: 'dropdown', 
                                                      options: sections[sectionIndex].questions[questionIndex].options || ['Opzione 1', 'Opzione 2'] 
                                                    } 
                                                  });
                                                }}
                                              >
                                                <span className="text-xl mr-2">▼</span> Menu a tendina
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleFeedback(sectionIndex, questionIndex)}
                                            className={question.feedback ? "text-primary" : ""}
                                          >
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            AI Feedback
                                          </Button>
                                        </div>
                                  </div>
                                
                                {showingFeedback?.sectionIndex === sectionIndex &&
                                showingFeedback?.questionIndex === questionIndex && (
                                  <div className="ml-11 bg-muted/50 p-4 rounded-lg space-y-3">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">{t("feedbackLabel")}</label>
                                      <Textarea
                                        placeholder={t("feedbackPlaceholder")}
                                        defaultValue={question.feedback || ""}
                                        onBlur={(e) => saveFeedback(sectionIndex, questionIndex, e.target.value)}
                                        className="min-h-20"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => dispatch({ type: 'SET_SHOW_SELECT_QUESTIONS_DIALOG', payload: true })}
                                          disabled={!question.feedback}
                                        >
                                          Estendi ad altre domande
                                        </Button>
                                        <span className="text-xs text-muted-foreground">
                                          {selectedQuestions.length} selezionate
                                        </span>
                                      </div>
                                      {!question.feedback && (
                                        <p className="text-xs text-muted-foreground">
                                          Scrivi prima il feedback per abilitare l'estensione.
                                        </p>
                                      )}
                                    </div>

                                    <Button
                                      onClick={() => applyFeedbackToQuestion(sectionIndex, questionIndex)}
                                      disabled={applyingFeedback || !question.feedback}
                                      className="w-full"
                                    >
                                      {applyingFeedback ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          {t("applyingFeedback")}
                                        </>
                                      ) : (
                                        t("applyFeedback")
                                      )}
                                    </Button>

                                    <Dialog open={showSelectQuestionsDialog} onOpenChange={(open) => dispatch({ type: 'SET_SHOW_SELECT_QUESTIONS_DIALOG', payload: open })}>
                                      <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                          <DialogTitle>Seleziona domande</DialogTitle>
                                          <DialogDescription>
                                            Spunta le domande a cui applicare il feedback
                                          </DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="h-64 border rounded p-2">
                                          {sections.map((section, sIdx) =>
                                            section.questions.map((q, qIdx) => (
                                              <div key={`${sIdx}-${qIdx}`} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                                                <Checkbox
                                                  id={`q-${sIdx}-${qIdx}`}
                                                  checked={selectedQuestions.some(
                                                    sq => sq.sectionIndex === sIdx && sq.questionIndex === qIdx
                                                  )}
                                                  onCheckedChange={() => {
                                                    dispatch({ 
                                                      type: 'TOGGLE_QUESTION_SELECTION', 
                                                      payload: { sectionIndex: sIdx, questionIndex: qIdx } 
                                                    });
                                                  }}
                                                />
                                                <Label htmlFor={`q-${sIdx}-${qIdx}`} className="text-sm cursor-pointer flex-1">
                                                  <span className="font-medium">{section.name}</span> - {q.question}
                                                </Label>
                                              </div>
                                            ))
                                          )}
                                        </ScrollArea>
                                        <div className="flex justify-end gap-2 pt-2">
                                          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_SHOW_SELECT_QUESTIONS_DIALOG', payload: false })}>{t("cancel")}</Button>
                                          <Button 
                                            size="sm" 
                                            onClick={() => {
                                              if (selectedQuestions.length === 0) {
                                                toast({
                                                  title: "Nessuna domanda selezionata",
                                                  description: "Seleziona almeno una domanda per applicare il feedback",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }
                                              applyFeedbackToMultipleQuestions(selectedQuestions, question.feedback || "");
                                              dispatch({ type: 'SET_SHOW_SELECT_QUESTIONS_DIALOG', payload: false });
                                              dispatch({ type: 'SET_SELECTED_QUESTIONS', payload: [] });
                                            }}
                                          >
                                            Applica
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                      
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

                {/* Pulsante per aggiungere una nuova sezione con AI */}
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


      {/* Dialog per aggiungere nuova sezione con AI */}
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

      {/* Dialog per nuovo modello */}
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

      {/* Preview Dialog */}
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
                          {question.type === "multiple" && "Risposta multipla"}
                          {question.type === "single" && "Risposta singola"}
                          {question.type === "open" && "Risposta aperta"}
                        </p>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                {question.type === "multiple" ? (
                                  <Checkbox disabled />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2" />
                                )}
                                <span className="text-sm">{option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {question.type === "open" && (
                          <Textarea className="mt-3" disabled placeholder="Risposta aperta..." />
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

      {/* Save Survey Dialog */}
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
