import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Trash2, Check, X, MessageSquare, Plus, Loader2 } from "lucide-react";
import { Question, SurveyState, SurveyAction } from "@/hooks/useSurveyState";
import { useState } from "react";

interface QuestionEditorProps {
  question: Question;
  questionIndex: number;
  sectionIndex: number;
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
  applyFeedbackToQuestion: (sectionIndex: number, questionIndex: number, feedback: string) => void;
  applyFeedbackToMultipleQuestions: (questions: Array<{sectionIndex: number, questionIndex: number}>, feedback: string) => void;
}

export const QuestionEditor = ({
  question,
  questionIndex,
  sectionIndex,
  state,
  dispatch,
  applyFeedbackToQuestion,
  applyFeedbackToMultipleQuestions,
}: QuestionEditorProps) => {
  const [feedbackText, setFeedbackText] = useState("");
  
  const isEditing = state.editingQuestion?.sectionIndex === sectionIndex && 
                    state.editingQuestion?.questionIndex === questionIndex;
  const isShowingFeedback = state.showingFeedback?.sectionIndex === sectionIndex && 
                            state.showingFeedback?.questionIndex === questionIndex;
  const isSelected = state.selectedQuestions.some(
    sq => sq.sectionIndex === sectionIndex && sq.questionIndex === questionIndex
  );

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case "multiple_choice": return "○";
      case "checkbox": return "☐";
      case "short_answer": return "___";
      case "paragraph": return "¶";
      case "dropdown": return "▼";
      default: return "?";
    }
  };

  const startEditing = () => {
    dispatch({ type: 'START_EDIT_QUESTION', payload: { sectionIndex, questionIndex } });
  };

  const cancelEditing = () => {
    dispatch({ type: 'CANCEL_EDITING' });
  };

  const saveEdit = () => {
    dispatch({ type: 'SAVE_EDITED_QUESTION' });
  };

  const deleteQuestion = () => {
    dispatch({ type: 'DELETE_QUESTION', payload: { sectionIndex, questionIndex } });
  };

  const toggleFeedback = () => {
    dispatch({ type: 'TOGGLE_FEEDBACK', payload: { sectionIndex, questionIndex } });
    if (!isShowingFeedback) {
      setFeedbackText("");
    }
  };

  const toggleSelect = () => {
    dispatch({ type: 'TOGGLE_QUESTION_SELECTION', payload: { sectionIndex, questionIndex } });
  };

  const updateEditedQuestion = (updates: Partial<Question>) => {
    dispatch({ type: 'UPDATE_EDITED_QUESTION', payload: updates });
  };

  const addOption = () => {
    dispatch({ type: 'ADD_EDITED_QUESTION_OPTION' });
  };

  const removeOption = (index: number) => {
    dispatch({ type: 'REMOVE_EDITED_QUESTION_OPTION', payload: index });
  };

  const updateOption = (index: number, value: string) => {
    dispatch({ type: 'UPDATE_EDITED_QUESTION_OPTION', payload: { index, value } });
  };

  // Edit mode
  if (isEditing && state.editedQuestion) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Domanda</label>
          <Textarea
            value={state.editedQuestion.question}
            onChange={(e) => updateEditedQuestion({ question: e.target.value })}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={state.editedQuestion.type}
              onValueChange={(value) => updateEditedQuestion({ type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_answer">Risposta breve</SelectItem>
                <SelectItem value="paragraph">Paragrafo</SelectItem>
                <SelectItem value="multiple_choice">Scelta multipla</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="dropdown">Menu a tendina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id={`required-${sectionIndex}-${questionIndex}`}
              checked={state.editedQuestion.required}
              onCheckedChange={(checked) => updateEditedQuestion({ required: !!checked })}
            />
            <label htmlFor={`required-${sectionIndex}-${questionIndex}`} className="text-sm">Obbligatoria</label>
          </div>
        </div>

        {(state.editedQuestion.type === "multiple_choice" || 
          state.editedQuestion.type === "checkbox" || 
          state.editedQuestion.type === "dropdown") && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Opzioni</label>
            {state.editedQuestion.options?.map((opt, optIndex) => (
              <div key={optIndex} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(optIndex, e.target.value)}
                  placeholder={`Opzione ${optIndex + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(optIndex)}
                  disabled={(state.editedQuestion?.options?.length || 0) <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi opzione
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={cancelEditing}>
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>
          <Button size="sm" onClick={saveEdit}>
            <Check className="h-4 w-4 mr-2" />
            Salva
          </Button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={toggleSelect}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground font-mono text-sm mt-0.5">
              {getQuestionIcon(question.type)}
            </span>
            <div className="flex-1">
              <p className="font-medium">
                {question.question}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </p>
              {question.options && question.options.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {question.options.map((opt, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span>{question.type === "checkbox" ? "☐" : "○"}</span>
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFeedback}
            title="AI Feedback"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={startEditing}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteQuestion}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Feedback Panel */}
      {isShowingFeedback && (
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
          <Textarea
            placeholder="Descrivi come vuoi migliorare questa domanda..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => applyFeedbackToQuestion(sectionIndex, questionIndex, feedbackText)}
              disabled={state.applyingFeedback || !feedbackText.trim()}
            >
              {state.applyingFeedback ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applicando...
                </>
              ) : (
                "Applica a questa domanda"
              )}
            </Button>
            {state.selectedQuestions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyFeedbackToMultipleQuestions(state.selectedQuestions, feedbackText)}
                disabled={state.applyingFeedback || !feedbackText.trim()}
              >
                Applica a selezionate ({state.selectedQuestions.length})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
