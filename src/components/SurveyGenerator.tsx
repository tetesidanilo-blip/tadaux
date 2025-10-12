import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Edit2, Trash2, Check, X, Languages, MessageSquare, Plus, CheckCircle2, Circle, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Question {
  question: string;
  type: string;
  options?: string[];
  required: boolean;
  section?: string;
  feedback?: string;
  selected?: boolean;
}

interface Section {
  name: string;
  questions: Question[];
}

interface SurveyGeneratorProps {
  onBack: () => void;
}

export const SurveyGenerator = ({ onBack }: SurveyGeneratorProps) => {
  const { language: uiLanguage, setLanguage: setUiLanguage, t } = useLanguage();
  const [description, setDescription] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [language, setLanguage] = useState("it");
  const [generatingMore, setGeneratingMore] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ sectionIndex: number; questionIndex: number } | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  const [showingFeedback, setShowingFeedback] = useState<{ sectionIndex: number; questionIndex: number } | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [applyingFeedback, setApplyingFeedback] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'single' | 'multiple' | null>(null);
  const [sourceFeedback, setSourceFeedback] = useState<{ sectionIndex: number; questionIndex: number; feedback: string } | null>(null);
  const [addingSectionManually, setAddingSectionManually] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSectionDialog, setAddingSectionDialog] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [newSectionLanguage, setNewSectionLanguage] = useState("it");
  const [generatingNewSection, setGeneratingNewSection] = useState(false);
  const { toast } = useToast();

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
          setUploadedFile(file);
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
      const importedSections: Section[] = Array.from(sectionMap.entries()).map(([name, questions]) => ({
        name,
        questions
      }));

      setSections(prev => [...prev, ...importedSections]);

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

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: uploadedFile ? `Document: ${uploadedFile.name}` : description,
          hasDocument: !!uploadedFile,
          language 
        },
      });

      if (error) throw error;

      const newQuestions = data.questions.map((q: Question) => ({
        ...q,
        section: sectionName
      }));

      setSections(prev => [...prev, {
        name: sectionName,
        questions: newQuestions
      }]);

      setDescription("");
      setSectionName("");
      setUploadedFile(null);

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
      setIsGenerating(false);
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
    link.setAttribute("download", "google-forms-survey.csv");
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
    link.setAttribute("download", "survey.doc");
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
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      
      // Title
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('QUESTIONARIO GENERATO', margin, yPosition);
      yPosition += 15;
      
      sections.forEach((section, sectionIndex) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Section title
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`SEZIONE: ${section.name}`, margin, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
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
          
          const questionText = `${questionNumber}. ${q.question} (${typeLabels[q.type] || q.type})${q.required ? ' *OBB.' : ''}`;
          const lines = doc.splitTextToSize(questionText, 170);
          doc.text(lines, margin, yPosition);
          yPosition += lines.length * 5 + 3;
          
          // Options
          if (q.options && q.options.length > 0) {
            q.options.forEach((opt) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              const symbol = q.type === 'checkbox' ? '☐' : '○';
              const optionLines = doc.splitTextToSize(`   ${symbol} ${opt}`, 165);
              doc.text(optionLines, margin + 5, yPosition);
              yPosition += optionLines.length * 5;
            });
          }
          
          yPosition += 5;
        });
        
        yPosition += 5;
      });
      
      // Save PDF
      doc.save('survey.pdf');
      
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
    setSections(prev => prev.filter(s => s.name !== sectionName));
    toast({
      title: t("sectionRemoved"),
      description: `"${sectionName}" ${t("hasBeenRemoved")}`,
    });
  };

  const clearAllSections = () => {
    setSections([]);
    toast({
      title: t("allSectionsCleared"),
      description: t("surveyReset"),
    });
  };

  const startEditingQuestion = (sectionIndex: number, questionIndex: number) => {
    setEditingQuestion({ sectionIndex, questionIndex });
    setEditedQuestion({ ...sections[sectionIndex].questions[questionIndex] });
  };

  const cancelEditing = () => {
    setEditingQuestion(null);
    setEditedQuestion(null);
  };

  const saveEditedQuestion = () => {
    if (!editingQuestion || !editedQuestion) return;

    setSections(prev => prev.map((section, sIdx) => {
      if (sIdx === editingQuestion.sectionIndex) {
        return {
          ...section,
          questions: section.questions.map((q, qIdx) => 
            qIdx === editingQuestion.questionIndex ? editedQuestion : q
          )
        };
      }
      return section;
    }));

    toast({
      title: t("questionUpdated"),
      description: t("changesSaved"),
    });

    cancelEditing();
  };

  const generateMoreQuestions = async (sectionIndex: number) => {
    const section = sections[sectionIndex];
    
    setGeneratingMore(sectionIndex);
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

      setSections(prev => prev.map((s, idx) => 
        idx === sectionIndex 
          ? { ...s, questions: [...s.questions, ...newQuestions] }
          : s
      ));

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
      setGeneratingMore(null);
    }
  };

  const deleteQuestion = (sectionIndex: number, questionIndex: number) => {
    setSections(prev => prev.map((section, sIdx) => {
      if (sIdx === sectionIndex) {
        const newQuestions = section.questions.filter((_, qIdx) => qIdx !== questionIndex);
        return { ...section, questions: newQuestions };
      }
      return section;
    }).filter(section => section.questions.length > 0));

    toast({
      title: t("questionDeleted"),
      description: t("questionRemoved"),
    });
  };

  const updateEditedQuestionOptions = (index: number, value: string) => {
    if (!editedQuestion) return;
    const newOptions = [...(editedQuestion.options || [])];
    newOptions[index] = value;
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const addOptionToEditedQuestion = () => {
    if (!editedQuestion) return;
    setEditedQuestion({
      ...editedQuestion,
      options: [...(editedQuestion.options || []), ""]
    });
  };

  const removeOptionFromEditedQuestion = (index: number) => {
    if (!editedQuestion) return;
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options?.filter((_, i) => i !== index)
    });
  };

  const toggleFeedback = (sectionIndex: number, questionIndex: number) => {
    if (showingFeedback?.sectionIndex === sectionIndex && showingFeedback?.questionIndex === questionIndex) {
      setShowingFeedback(null);
    } else {
      setShowingFeedback({ sectionIndex, questionIndex });
    }
  };

  const saveFeedback = (sectionIndex: number, questionIndex: number, feedback: string) => {
    setSections(prev => prev.map((section, sIdx) => {
      if (sIdx === sectionIndex) {
        return {
          ...section,
          questions: section.questions.map((q, qIdx) => 
            qIdx === questionIndex ? { ...q, feedback } : q
          )
        };
      }
      return section;
    }));

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

    setApplyingFeedback(true);
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

      setSections(prev => prev.map((section, sIdx) => {
        if (sIdx === sectionIndex) {
          return {
            ...section,
            questions: section.questions.map((q, qIdx) => 
              qIdx === questionIndex 
                ? { ...refinedQuestion, section: section.name, feedback: q.feedback }
                : q
            )
          };
        }
        return section;
      }));

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
      setApplyingFeedback(false);
    }
  };

  const toggleQuestionSelection = (sectionIndex: number, questionIndex: number) => {
    const key = `${sectionIndex}-${questionIndex}`;
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const selectAllQuestions = () => {
    const allKeys = sections.flatMap((section, sIdx) =>
      section.questions.map((_, qIdx) => `${sIdx}-${qIdx}`)
    );
    setSelectedQuestions(new Set(allKeys));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions(new Set());
  };

  const startExtendFeedback = (sectionIndex: number, questionIndex: number) => {
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

    setSourceFeedback({ sectionIndex, questionIndex, feedback });
    setFeedbackMode('multiple');
    // Keep the feedback box open so user can continue editing if needed
  };

  const cancelFeedbackMode = () => {
    setFeedbackMode(null);
    setSelectedQuestions(new Set());
    setSourceFeedback(null);
  };

  const applyFeedbackToSelected = async () => {
    if (!sourceFeedback || selectedQuestions.size === 0) return;

    setApplyingFeedback(true);
    const totalQuestions = selectedQuestions.size;
    let completed = 0;

    try {
      const selectedArray = Array.from(selectedQuestions);
      
      for (const key of selectedArray) {
        const [sIdx, qIdx] = key.split('-').map(Number);
        const question = sections[sIdx].questions[qIdx];

        try {
          const { data, error } = await supabase.functions.invoke("generate-survey", {
            body: { 
              refineQuestion: {
                question: question.question,
                feedback: sourceFeedback.feedback,
                type: question.type,
                options: question.options
              },
              language 
            },
          });

          if (error) throw error;

          const refinedQuestion = data.questions[0];

          setSections(prev => prev.map((section, sectionIdx) => {
            if (sectionIdx === sIdx) {
              return {
                ...section,
                questions: section.questions.map((q, questionIdx) => 
                  questionIdx === qIdx 
                    ? { ...refinedQuestion, section: section.name, feedback: q.feedback }
                    : q
                )
              };
            }
            return section;
          }));

          completed++;
        } catch (error) {
          console.error(`Error refining question ${key}:`, error);
        }
      }

      toast({
        title: t("feedbackApplied"),
        description: `${completed} ${t("questionsUpdated")}`,
      });

      cancelFeedbackMode();
    } catch (error) {
      console.error("Error applying feedback to selected questions:", error);
      toast({
        title: t("generationFailed"),
        description: t("failedToGenerate"),
        variant: "destructive",
      });
    } finally {
      setApplyingFeedback(false);
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

    setSections(prev => [...prev, {
      name: newSectionName,
      questions: []
    }]);

    setNewSectionName("");
    setAddingSectionManually(false);

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

    setGeneratingNewSection(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: newSectionDescription,
          hasDocument: false,
          language: newSectionLanguage 
        },
      });

      if (error) throw error;

      const newQuestions = data.questions.map((q: Question) => ({
        ...q,
        section: newSectionTitle
      }));

      setSections(prev => [...prev, {
        name: newSectionTitle,
        questions: newQuestions
      }]);

      setNewSectionTitle("");
      setNewSectionDescription("");
      setNewSectionLanguage("it");
      setAddingSectionDialog(false);

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
      setGeneratingNewSection(false);
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
                  onChange={(e) => setLanguage(e.target.value)}
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
                  onChange={(e) => setSectionName(e.target.value)}
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
                  onChange={(e) => setDescription(e.target.value)}
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
                      onClick={() => setUploadedFile(null)}
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
                  <h3 className="text-2xl font-bold">{t("yourSurvey")}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={exportToCSV}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t("downloadCSV")}
                    </Button>
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
                        <h4 className="text-xl font-bold text-primary">
                          {section.name}
                        </h4>
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
                        const questionKey = `${sectionIndex}-${questionIndex}`;
                        const isSelected = selectedQuestions.has(questionKey);
                        const isSourceQuestion = sourceFeedback?.sectionIndex === sectionIndex && 
                                                sourceFeedback?.questionIndex === questionIndex;
                        
                        return (
                          <Card 
                            key={questionIndex} 
                            className={`p-4 border-l-4 transition-all ${
                              isSelected 
                                ? 'border-l-primary bg-primary/5 shadow-md' 
                                : isSourceQuestion && feedbackMode === 'multiple'
                                ? 'border-l-secondary bg-secondary/10'
                                : 'border-l-primary'
                            }`}
                          >
                            {isEditing && editedQuestion ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">{t("question")}</label>
                                  <Input
                                    value={editedQuestion.question}
                                    onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">{t("type")}</label>
                                    <select
                                      value={editedQuestion.type}
                                      onChange={(e) => setEditedQuestion({ ...editedQuestion, type: e.target.value })}
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
                                      onChange={(e) => setEditedQuestion({ ...editedQuestion, required: e.target.checked })}
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
                                <div className="flex gap-3">
                                  {feedbackMode === 'multiple' && !isSourceQuestion && (
                                    <button
                                      onClick={() => toggleQuestionSelection(sectionIndex, questionIndex)}
                                      className="mt-1 flex-shrink-0"
                                    >
                                      {isSelected ? (
                                        <CheckCircle2 className="w-6 h-6 text-primary" />
                                      ) : (
                                        <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                                      )}
                                    </button>
                                  )}
                                  {feedbackMode === 'multiple' && isSourceQuestion && (
                                    <div className="w-6 h-6 mt-1 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 space-y-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3 flex-1">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild disabled={feedbackMode === 'multiple'}>
                                            <button className="text-2xl hover:bg-muted/50 rounded px-1 py-1 transition-colors cursor-pointer mt-1" title="Cambia tipo di domanda">
                                              {getQuestionIcon(question.type)}
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent className="bg-background">
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                setSections(prev => prev.map((section, sIdx) => {
                                                  if (sIdx === sectionIndex) {
                                                    return {
                                                      ...section,
                                                      questions: section.questions.map((q, qIdx) => 
                                                        qIdx === questionIndex 
                                                          ? { ...q, type: 'multiple_choice', options: q.options || ['Opzione 1', 'Opzione 2'] }
                                                          : q
                                                      )
                                                    };
                                                  }
                                                  return section;
                                                }));
                                              }}
                                            >
                                              <span className="text-xl mr-2">○</span> Scelta multipla
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                setSections(prev => prev.map((section, sIdx) => {
                                                  if (sIdx === sectionIndex) {
                                                    return {
                                                      ...section,
                                                      questions: section.questions.map((q, qIdx) => 
                                                        qIdx === questionIndex 
                                                          ? { ...q, type: 'checkbox', options: q.options || ['Opzione 1', 'Opzione 2'] }
                                                          : q
                                                      )
                                                    };
                                                  }
                                                  return section;
                                                }));
                                              }}
                                            >
                                              <span className="text-xl mr-2">☐</span> Caselle di controllo
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                setSections(prev => prev.map((section, sIdx) => {
                                                  if (sIdx === sectionIndex) {
                                                    return {
                                                      ...section,
                                                      questions: section.questions.map((q, qIdx) => 
                                                        qIdx === questionIndex 
                                                          ? { ...q, type: 'short_answer', options: undefined }
                                                          : q
                                                      )
                                                    };
                                                  }
                                                  return section;
                                                }));
                                              }}
                                            >
                                              <span className="text-xl mr-2">___</span> Risposta breve
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                setSections(prev => prev.map((section, sIdx) => {
                                                  if (sIdx === sectionIndex) {
                                                    return {
                                                      ...section,
                                                      questions: section.questions.map((q, qIdx) => 
                                                        qIdx === questionIndex 
                                                          ? { ...q, type: 'paragraph', options: undefined }
                                                          : q
                                                      )
                                                    };
                                                  }
                                                  return section;
                                                }));
                                              }}
                                            >
                                              <span className="text-xl mr-2">¶</span> Paragrafo
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                setSections(prev => prev.map((section, sIdx) => {
                                                  if (sIdx === sectionIndex) {
                                                    return {
                                                      ...section,
                                                      questions: section.questions.map((q, qIdx) => 
                                                        qIdx === questionIndex 
                                                          ? { ...q, type: 'dropdown', options: q.options || ['Opzione 1', 'Opzione 2'] }
                                                          : q
                                                      )
                                                    };
                                                  }
                                                  return section;
                                                }));
                                              }}
                                            >
                                              <span className="text-xl mr-2">▼</span> Menu a tendina
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                        <h5 className="font-medium text-base flex-1">
                                          {questionIndex + 1}. {question.question}
                                          {question.required && (
                                            <span className="text-destructive ml-1">*</span>
                                          )}
                                        </h5>
                                      </div>
                                      <div className="flex gap-2 items-center">
                                        {feedbackMode === 'multiple' && isSourceQuestion && (
                                          <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-1 rounded font-medium">
                                            {t("sourceQuestion")}
                                          </span>
                                        )}
                                        {feedbackMode !== 'multiple' && (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => toggleFeedback(sectionIndex, questionIndex)}
                                              className={question.feedback ? "text-primary" : ""}
                                            >
                                              <MessageSquare className="w-4 h-4" />
                                            </Button>
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
                                          </>
                                        )}
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
                                    </div>
                                  </div>
                                </div>
                                
                                {showingFeedback?.sectionIndex === sectionIndex && 
                                showingFeedback?.questionIndex === questionIndex && (
                                  <div className="ml-11 bg-muted/50 p-4 rounded-lg space-y-3">
                                    <label className="text-sm font-medium">{t("feedbackLabel")}</label>
                                    <Textarea
                                      placeholder={t("feedbackPlaceholder")}
                                      defaultValue={question.feedback || ""}
                                      onBlur={(e) => saveFeedback(sectionIndex, questionIndex, e.target.value)}
                                      className="min-h-20"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      {t("feedbackHelp")}
                                    </p>
                                    <div className="flex gap-2 pt-2">
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => applyFeedbackToQuestion(sectionIndex, questionIndex)}
                                        disabled={applyingFeedback || !question.feedback}
                                      >
                                        {applyingFeedback ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {t("applying")}
                                          </>
                                        ) : (
                                          t("applyFeedback")
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => startExtendFeedback(sectionIndex, questionIndex)}
                                        disabled={applyingFeedback || !question.feedback}
                                      >
                                        {t("extendToOthers")}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                      
                      <div className="mt-4 pt-4 border-t">
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
                              {t("generateMore")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                 </div>

                {/* Pulsante per aggiungere una nuova sezione con AI */}
                <div className="mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setAddingSectionDialog(true)}
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
                      <Button size="lg">
                        <Download className="w-4 h-4 mr-2" />
                        {t("downloadCSV")}
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

      {feedbackMode === 'multiple' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
          <div className="container max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="font-medium">
                {selectedQuestions.size} {t("questionsSelected")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllQuestions}
              >
                {t("selectAll")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllQuestions}
              >
                {t("deselectAll")}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={cancelFeedbackMode}
                disabled={applyingFeedback}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={applyFeedbackToSelected}
                disabled={selectedQuestions.size === 0 || applyingFeedback}
              >
                {applyingFeedback ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("applyingFeedback")}
                  </>
                 ) : (
                  t("applyFeedback")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog per aggiungere nuova sezione con AI */}
      <Dialog open={addingSectionDialog} onOpenChange={setAddingSectionDialog}>
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
                onChange={(e) => setNewSectionLanguage(e.target.value)}
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
                onChange={(e) => setNewSectionTitle(e.target.value)}
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
                onChange={(e) => setNewSectionDescription(e.target.value)}
                className="min-h-24"
                disabled={generatingNewSection}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setAddingSectionDialog(false);
                  setNewSectionTitle("");
                  setNewSectionDescription("");
                  setNewSectionLanguage("it");
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
    </div>
  );
};
