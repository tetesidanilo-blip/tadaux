import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Edit2, Trash2, Check, X, MessageSquare, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Question, SurveyState, SurveyAction } from "@/hooks/useSurveyState";

interface QuestionEditorProps {
  question: Question;
  sectionIndex: number;
  questionIndex: number;
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
  applyFeedbackToQuestion: (sectionIndex: number, questionIndex: number) => void;
  applyFeedbackToMultipleQuestions: (
    questions: Array<{sectionIndex: number, questionIndex: number}>,
    feedback: string
  ) => void;
}

export const QuestionEditor = ({
  question,
  sectionIndex,
  questionIndex,
  state,
  dispatch,
  applyFeedbackToQuestion,
  applyFeedbackToMultipleQuestions
}: QuestionEditorProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const {
    editingQuestion,
    editedQuestion,
    showingFeedback,
    selectedQuestions,
    applyingFeedback,
    showSelectQuestionsDialog,
    sections
  } = state;

  const isEditing = editingQuestion?.sectionIndex === sectionIndex && 
                   editingQuestion?.questionIndex === questionIndex;

  // Helper functions
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

  const deleteQuestion = () => {
    dispatch({ type: 'DELETE_QUESTION', payload: { sectionIndex, questionIndex } });

    toast({
      title: t("questionDeleted"),
      description: t("questionRemoved"),
    });
  };

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
                      <X className="w-4 h-4" />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'CANCEL_EDITING' })}
            >
              <X className="w-4 h-4 mr-2" />
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => dispatch({ type: 'SAVE_EDITED_QUESTION' })}
            >
              <Check className="w-4 h-4 mr-2" />
              {t("save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <p className="font-medium text-base">
                {questionIndex + 1}. {question.question}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </p>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                  {question.type === "multiple_choice" && t("multipleChoice")}
                  {question.type === "checkbox" && t("checkboxes")}
                  {question.type === "short_answer" && t("shortAnswer")}
                  {question.type === "paragraph" && t("paragraph")}
                  {question.type === "dropdown" && t("dropdown")}
                </span>
              </div>

              {/* Display options in view mode (Google Forms style) */}
              {(question.type === "multiple_choice" || question.type === "checkbox") && question.options && (
                <div className="pl-4 space-y-2 mt-3">
                  {question.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {question.type === "multiple_choice" ? (
                        <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                      ) : (
                        <span className="w-4 h-4 rounded border-2 border-muted-foreground/40" />
                      )}
                      <span className="text-sm text-muted-foreground">{option}</span>
                    </div>
                  ))}
                </div>
              )}

              {question.type === "dropdown" && question.options && (
                <div className="pl-4 mt-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full max-w-xs justify-between">
                        {t("selectOption")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-background">
                      {question.options.map((option, idx) => (
                        <DropdownMenuItem key={idx}>{option}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {question.type === "short_answer" && (
                <div className="pl-4 mt-3">
                  <div className="border-b border-muted-foreground/30 w-full max-w-md pb-2">
                    <span className="text-sm text-muted-foreground/50">{t("shortAnswerPlaceholder")}</span>
                  </div>
                </div>
              )}

              {question.type === "paragraph" && (
                <div className="pl-4 mt-3">
                  <div className="border border-muted rounded-md p-3 w-full max-w-md">
                    <span className="text-sm text-muted-foreground/50">{t("paragraphPlaceholder")}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ 
                  type: 'START_EDIT_QUESTION', 
                  payload: { sectionIndex, questionIndex } 
                })}
                title={t("edit")}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteQuestion}
                title={t("delete")}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFeedback(sectionIndex, questionIndex)}
                title="AI Feedback"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              
              {/* Dropdown menu for changing question type in view mode */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" title={t("changeType")}>
                    <span className="text-xl">⋮</span>
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
            </div>
          </div>

          {/* AI Feedback UI */}
          {showingFeedback?.sectionIndex === sectionIndex && 
           showingFeedback?.questionIndex === questionIndex && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">💡 AI Feedback</label>
                <p className="text-xs text-muted-foreground">
                  Descrivi come vuoi che l'AI modifichi questa domanda.
                </p>
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
                          <label htmlFor={`q-${sIdx}-${qIdx}`} className="text-sm cursor-pointer flex-1">
                            {q.question}
                          </label>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        dispatch({ type: 'SET_SHOW_SELECT_QUESTIONS_DIALOG', payload: false });
                        dispatch({ type: 'SET_SELECTED_QUESTIONS', payload: [] });
                      }}
                    >
                      Annulla
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedQuestions.length === 0) {
                          toast({
                            title: "Nessuna domanda selezionata",
                            description: "Seleziona almeno una domanda per applicare il feedback.",
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
};
