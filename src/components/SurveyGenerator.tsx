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
}

interface SurveyGeneratorProps {
  onBack: () => void;
}

export const SurveyGenerator = ({ onBack }: SurveyGeneratorProps) => {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
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

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { 
          description: uploadedFile ? `Document: ${uploadedFile.name}` : description,
          hasDocument: !!uploadedFile 
        },
      });

      if (error) throw error;

      setQuestions(data.questions);
      toast({
        title: "Survey generated!",
        description: "Your survey questions are ready",
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
              Describe your survey needs or upload a document to get started
            </p>
          </div>

          <Card className="p-6 backdrop-blur-sm bg-card/50">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Survey Description
                </label>
                <Textarea
                  placeholder="Example: Create a customer satisfaction survey with questions about product quality, delivery speed, and customer service..."
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
                disabled={isGenerating || (!description && !uploadedFile)}
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
                    Generating Survey...
                  </>
                ) : (
                  "Generate Survey"
                )}
              </Button>
            </div>
          </Card>

          {questions.length > 0 && (
            <Card className="p-6 backdrop-blur-sm bg-card/50">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Generated Survey Questions</h3>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const surveyText = questions.map((q, i) => 
                        `${i + 1}. ${q.question}\nType: ${q.type}\nRequired: ${q.required ? "Yes" : "No"}${q.options ? `\nOptions: ${q.options.join(", ")}` : ""}`
                      ).join("\n\n");
                      navigator.clipboard.writeText(surveyText);
                      toast({
                        title: "Copied!",
                        description: "Survey copied to clipboard",
                      });
                    }}
                  >
                    Copy All
                  </Button>
                </div>

                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <Card key={index} className="p-4 border-l-4 border-l-primary">
                      <div className="flex gap-3">
                        <span className="text-2xl">{getQuestionIcon(question.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-lg">
                              {index + 1}. {question.question}
                            </h4>
                            {question.required && (
                              <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground capitalize mb-2">
                            Type: {question.type.replace("_", " ")}
                          </p>
                          {question.options && question.options.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-sm font-medium">Options:</p>
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

                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex gap-2 items-start">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Export to Google Forms</p>
                      <p className="text-sm text-muted-foreground">
                        Copy these questions and paste them into Google Forms. 
                        Match the question types and options as shown above.
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
