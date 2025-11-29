import { SurveyState, SurveyAction } from "@/hooks/useSurveyState";
import { QuestionEditor } from "@/components/QuestionEditor";
import { SectionHeader } from "./SectionHeader";
import { SectionActions } from "./SectionActions";

interface SectionListProps {
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
  onRemoveSection: (name: string) => void;
  onSaveSectionName: () => void;
  onCancelEditSectionName: () => void;
  onGenerateMore: (sectionIndex: number) => void;
  onOpenMoreQuestionsDialog: (sectionIndex: number) => void;
  applyFeedbackToQuestion: (sectionIndex: number, questionIndex: number) => void;
  applyFeedbackToMultipleQuestions: (
    questions: Array<{ sectionIndex: number; questionIndex: number }>,
    feedback: string
  ) => void;
}

export const SectionList = ({
  state,
  dispatch,
  onRemoveSection,
  onSaveSectionName,
  onCancelEditSectionName,
  onGenerateMore,
  onOpenMoreQuestionsDialog,
  applyFeedbackToQuestion,
  applyFeedbackToMultipleQuestions,
}: SectionListProps) => {
  const { sections, editingSectionName, editedSectionName, generatingMore } = state;

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <SectionHeader
            sectionName={section.name}
            sectionIndex={sectionIndex}
            isEditing={editingSectionName === sectionIndex}
            editedName={editedSectionName}
            dispatch={dispatch}
            onRemove={() => onRemoveSection(section.name)}
            onSave={onSaveSectionName}
            onCancel={onCancelEditSectionName}
          />

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

          <SectionActions
            sectionIndex={sectionIndex}
            isGenerating={generatingMore === sectionIndex}
            onContinuePrevious={() => onGenerateMore(sectionIndex)}
            onNewModel={() => onOpenMoreQuestionsDialog(sectionIndex)}
          />
        </div>
      ))}
    </div>
  );
};
