import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Edit2, Trash2, Check, X, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Question {
  question: string;
  type: string;
  options?: string[];
  required: boolean;
  section?: string;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ sectionIndex: number; questionIndex: number } | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword") {
        setUploadedFile(file);
        toast({
          title: t("fileUploaded"),
          description: `${file.name} ${t("fileReady")}`,
        });
      } else {
        toast({
          title: t("invalidFileType"),
          description: t("uploadPDFOrWord"),
          variant: "destructive",
        });
      }
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
                <Textarea
                  placeholder={t("sectionNamePlaceholder")}
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="min-h-20"
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
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("supportsFiles")}
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
                        
                        return (
                          <Card key={questionIndex} className="p-4 border-l-4 border-l-primary">
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
                              <div className="flex gap-3">
                                <span className="text-2xl">{getQuestionIcon(question.type)}</span>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className="font-semibold text-lg">
                                      {questionIndex + 1}. {question.question}
                                    </h5>
                                    <div className="flex gap-2 items-center">
                                      {question.required && (
                                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                                          Obbligatorio
                                        </span>
                                      )}
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
                                  <p className="text-sm text-muted-foreground capitalize mb-2">
                                    Tipo: {question.type.replace("_", " ")}
                                  </p>
                                  {question.options && question.options.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                      <p className="text-sm font-medium">Opzioni:</p>
                                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                                        {question.options.map((option, i) => (
                                          <li key={i}>{option}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  ))}
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
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
