import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [description, setDescription] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword") {
        setUploadedFile(file);
        toast({
          title: "File uploaded",
          description: `${file.name} is ready to be processed`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document",
          variant: "destructive",
        });
      }
    }
  };

  const handleGenerate = async () => {
    if (!description && !uploadedFile) {
      toast({
        title: "Input required",
        description: "Please provide a description or upload a document",
        variant: "destructive",
      });
      return;
    }

    if (!sectionName.trim()) {
      toast({
        title: "Section name required",
        description: "Please provide a name for this section",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: uploadedFile ? `Document: ${uploadedFile.name}` : description,
          hasDocument: !!uploadedFile 
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
        title: "Section added!",
        description: `${newQuestions.length} questions added to "${sectionName}"`,
      });
    } catch (error) {
      console.error("Error generating survey:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate survey. Please try again.",
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
      title: "CSV exported!",
      description: "Import this file into Google Forms",
    });
  };

  const removeSection = (sectionName: string) => {
    setSections(prev => prev.filter(s => s.name !== sectionName));
    toast({
      title: "Section removed",
      description: `"${sectionName}" has been removed`,
    });
  };

  const clearAllSections = () => {
    setSections([]);
    toast({
      title: "All sections cleared",
      description: "Survey has been reset",
    });
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-8"
        >
          ← Back to Home
        </Button>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Create Your Survey</h2>
            <p className="text-muted-foreground">
              Genera domande per sezione e costruisci il tuo questionario completo
            </p>
            {sections.length > 0 && (
              <p className="text-sm text-primary mt-2">
                {sections.length} {sections.length === 1 ? 'sezione' : 'sezioni'} • {getAllQuestions().length} domande totali
              </p>
            )}
          </div>

          <Card className="p-6 backdrop-blur-sm bg-card/50">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nome Sezione *
                </label>
                <Textarea
                  placeholder="Esempio: Informazioni personali, Soddisfazione del cliente, Feedback sul prodotto..."
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="min-h-20"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descrizione Domande
                </label>
                <Textarea
                  placeholder="Esempio: Crea domande sulla qualità del prodotto, velocità di consegna e servizio clienti..."
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
                  Upload Document
                </label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={isGenerating}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadedFile ? uploadedFile.name : "Choose File"}
                  </Button>
                  {uploadedFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                    >
                      Clear
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
                  Supports PDF and Word documents
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
                    Generazione in corso...
                  </>
                ) : (
                  sections.length > 0 ? "Aggiungi Nuova Sezione" : "Genera Prima Sezione"
                )}
              </Button>
            </div>
          </Card>

          {sections.length > 0 && (
            <Card className="p-6 backdrop-blur-sm bg-card/50">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Il Tuo Questionario</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={exportToCSV}
                    >
                      Scarica CSV
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearAllSections}
                    >
                      Cancella Tutto
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
                          Rimuovi Sezione
                        </Button>
                      </div>
                      
                      {section.questions.map((question, questionIndex) => (
                        <Card key={questionIndex} className="p-4 border-l-4 border-l-primary">
                          <div className="flex gap-3">
                            <span className="text-2xl">{getQuestionIcon(question.type)}</span>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-semibold text-lg">
                                  {questionIndex + 1}. {question.question}
                                </h5>
                                {question.required && (
                                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                                    Obbligatorio
                                  </span>
                                )}
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
                        </Card>
                      ))}
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
