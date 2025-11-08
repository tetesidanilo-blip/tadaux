import { useReducer } from "react";

export interface Question {
  question: string;
  type: string;
  options?: string[];
  required: boolean;
  section?: string;
  feedback?: string;
  selected?: boolean;
}

export interface Section {
  name: string;
  questions: Question[];
}

export interface SurveyState {
  // Form inputs
  description: string;
  sectionName: string;
  language: string;
  questionCount: number | null;
  
  // Generation states
  generatingMore: number | null;
  isGenerating: boolean;
  generatingNewSection: boolean;
  applyingFeedback: boolean;
  
  // Data
  sections: Section[];
  uploadedFile: File | null;
  currentDraftId: string | null;
  isSaving: boolean;
  
  // Editing states
  editingQuestion: { sectionIndex: number; questionIndex: number } | null;
  editedQuestion: Question | null;
  editingSectionName: number | null;
  editedSectionName: string;
  
  // Feedback states
  showingFeedback: { sectionIndex: number; questionIndex: number } | null;
  selectedQuestions: Array<{sectionIndex: number; questionIndex: number}>;
  
  // Dialog states
  addingSectionManually: boolean;
  addingSectionDialog: boolean;
  showSaveDialog: boolean;
  showPreview: boolean;
  showMoreQuestionsDialog: boolean;
  showSelectQuestionsDialog: boolean;
  
  // New section form
  newSectionName: string;
  newSectionTitle: string;
  newSectionDescription: string;
  newSectionLanguage: string;
  newSectionQuestionCount: number | null;
  
  // More questions form
  currentSectionForMore: number | null;
  newModelDescription: string;
  moreQuestionsCount: number | null;
  
  // History management
  history: Section[][];
  historyIndex: number;
}

export type SurveyAction =
  // Form updates
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_SECTION_NAME'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'SET_QUESTION_COUNT'; payload: number | null }
  
  // Generation states
  | { type: 'SET_GENERATING_MORE'; payload: number | null }
  | { type: 'SET_IS_GENERATING'; payload: boolean }
  | { type: 'SET_GENERATING_NEW_SECTION'; payload: boolean }
  | { type: 'SET_APPLYING_FEEDBACK'; payload: boolean }
  
  // Data updates
  | { type: 'SET_SECTIONS'; payload: Section[] }
  | { type: 'ADD_SECTION'; payload: Section }
  | { type: 'UPDATE_SECTION'; payload: { index: number; section: Section } }
  | { type: 'REMOVE_SECTION'; payload: string }
  | { type: 'CLEAR_SECTIONS' }
  | { type: 'SET_UPLOADED_FILE'; payload: File | null }
  | { type: 'SET_CURRENT_DRAFT_ID'; payload: string | null }
  | { type: 'SET_IS_SAVING'; payload: boolean }
  
  // Question editing
  | { type: 'START_EDIT_QUESTION'; payload: { sectionIndex: number; questionIndex: number } }
  | { type: 'SET_EDITED_QUESTION'; payload: Question | null }
  | { type: 'UPDATE_EDITED_QUESTION'; payload: Partial<Question> }
  | { type: 'SAVE_EDITED_QUESTION' }
  | { type: 'CANCEL_EDITING' }
  | { type: 'DELETE_QUESTION'; payload: { sectionIndex: number; questionIndex: number } }
  | { type: 'UPDATE_QUESTION_TYPE'; payload: { sectionIndex: number; questionIndex: number; type: string; options?: string[] } }
  
  // Question options editing
  | { type: 'UPDATE_EDITED_QUESTION_OPTION'; payload: { index: number; value: string } }
  | { type: 'ADD_EDITED_QUESTION_OPTION' }
  | { type: 'REMOVE_EDITED_QUESTION_OPTION'; payload: number }
  
  // Section name editing
  | { type: 'START_EDIT_SECTION_NAME'; payload: number }
  | { type: 'SET_EDITED_SECTION_NAME'; payload: string }
  | { type: 'SAVE_SECTION_NAME' }
  | { type: 'CANCEL_EDIT_SECTION_NAME' }
  
  // Feedback
  | { type: 'TOGGLE_FEEDBACK'; payload: { sectionIndex: number; questionIndex: number } }
  | { type: 'SAVE_FEEDBACK'; payload: { sectionIndex: number; questionIndex: number; feedback: string } }
  | { type: 'SET_SELECTED_QUESTIONS'; payload: Array<{sectionIndex: number; questionIndex: number}> }
  | { type: 'TOGGLE_QUESTION_SELECTION'; payload: { sectionIndex: number; questionIndex: number } }
  | { type: 'UPDATE_QUESTION_WITH_FEEDBACK'; payload: { sectionIndex: number; questionIndex: number; question: Question } }
  
  // Dialogs
  | { type: 'SET_ADDING_SECTION_MANUALLY'; payload: boolean }
  | { type: 'SET_ADDING_SECTION_DIALOG'; payload: boolean }
  | { type: 'SET_SHOW_SAVE_DIALOG'; payload: boolean }
  | { type: 'SET_SHOW_PREVIEW'; payload: boolean }
  | { type: 'SET_SHOW_MORE_QUESTIONS_DIALOG'; payload: boolean }
  | { type: 'SET_SHOW_SELECT_QUESTIONS_DIALOG'; payload: boolean }
  
  // New section form
  | { type: 'SET_NEW_SECTION_NAME'; payload: string }
  | { type: 'SET_NEW_SECTION_TITLE'; payload: string }
  | { type: 'SET_NEW_SECTION_DESCRIPTION'; payload: string }
  | { type: 'SET_NEW_SECTION_LANGUAGE'; payload: string }
  | { type: 'SET_NEW_SECTION_QUESTION_COUNT'; payload: number | null }
  | { type: 'RESET_NEW_SECTION_FORM' }
  
  // More questions form
  | { type: 'SET_CURRENT_SECTION_FOR_MORE'; payload: number | null }
  | { type: 'SET_NEW_MODEL_DESCRIPTION'; payload: string }
  | { type: 'SET_MORE_QUESTIONS_COUNT'; payload: number | null }
  | { type: 'RESET_MORE_QUESTIONS_FORM' }
  
  // Combined actions
  | { type: 'ADD_QUESTIONS_TO_SECTION'; payload: { sectionIndex: number; questions: Question[] } }
  | { type: 'RESET_GENERATION_FORM' }
  
  // History actions
  | { type: 'UNDO' }
  | { type: 'REDO' };

// Actions that should save to history
const HISTORY_ACTIONS = [
  'SET_SECTIONS', 'ADD_SECTION', 'UPDATE_SECTION', 'REMOVE_SECTION', 'CLEAR_SECTIONS',
  'SAVE_EDITED_QUESTION', 'DELETE_QUESTION', 'UPDATE_QUESTION_TYPE',
  'SAVE_SECTION_NAME', 'SAVE_FEEDBACK', 'UPDATE_QUESTION_WITH_FEEDBACK',
  'ADD_QUESTIONS_TO_SECTION'
];

function saveToHistory(state: SurveyState): SurveyState {
  // Don't save if sections are empty
  if (state.sections.length === 0) return state;
  
  // If we're not at the end of history, truncate future history
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  
  // Add current state to history (deep copy sections)
  const sectionsSnapshot = JSON.parse(JSON.stringify(state.sections));
  newHistory.push(sectionsSnapshot);
  
  // Keep only last 50 history states to prevent memory issues
  const trimmedHistory = newHistory.slice(-50);
  
  return {
    ...state,
    history: trimmedHistory,
    historyIndex: trimmedHistory.length - 1
  };
}

export function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  // Save to history before applying certain actions
  const shouldSaveHistory = HISTORY_ACTIONS.includes(action.type);
  const stateWithHistory = shouldSaveHistory ? saveToHistory(state) : state;
  
  switch (action.type) {
    // Form updates
    case 'SET_DESCRIPTION':
      return { ...stateWithHistory, description: action.payload };
    case 'SET_SECTION_NAME':
      return { ...stateWithHistory, sectionName: action.payload };
    case 'SET_LANGUAGE':
      return { ...stateWithHistory, language: action.payload };
    case 'SET_QUESTION_COUNT':
      return { ...stateWithHistory, questionCount: action.payload };
    
    // Generation states
    case 'SET_GENERATING_MORE':
      return { ...stateWithHistory, generatingMore: action.payload };
    case 'SET_IS_GENERATING':
      return { ...stateWithHistory, isGenerating: action.payload };
    case 'SET_GENERATING_NEW_SECTION':
      return { ...stateWithHistory, generatingNewSection: action.payload };
    case 'SET_APPLYING_FEEDBACK':
      return { ...stateWithHistory, applyingFeedback: action.payload };
    
    // Data updates
    case 'SET_SECTIONS':
      return { ...stateWithHistory, sections: action.payload };
    case 'ADD_SECTION':
      return { ...stateWithHistory, sections: [...stateWithHistory.sections, action.payload] };
    case 'UPDATE_SECTION':
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((section, idx) =>
          idx === action.payload.index ? action.payload.section : section
        )
      };
    case 'REMOVE_SECTION':
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.filter(s => s.name !== action.payload)
      };
    case 'CLEAR_SECTIONS':
      return { ...stateWithHistory, sections: [] };
    case 'SET_UPLOADED_FILE':
      return { ...stateWithHistory, uploadedFile: action.payload };
    case 'SET_CURRENT_DRAFT_ID':
      return { ...stateWithHistory, currentDraftId: action.payload };
    case 'SET_IS_SAVING':
      return { ...stateWithHistory, isSaving: action.payload };
    
    // Question editing
    case 'START_EDIT_QUESTION':
      return {
        ...stateWithHistory,
        editingQuestion: action.payload,
        editedQuestion: { ...stateWithHistory.sections[action.payload.sectionIndex].questions[action.payload.questionIndex] }
      };
    case 'SET_EDITED_QUESTION':
      return { ...stateWithHistory, editedQuestion: action.payload };
    case 'UPDATE_EDITED_QUESTION':
      return {
        ...stateWithHistory,
        editedQuestion: stateWithHistory.editedQuestion ? { ...stateWithHistory.editedQuestion, ...action.payload } : null
      };
    case 'SAVE_EDITED_QUESTION':
      if (!stateWithHistory.editingQuestion || !stateWithHistory.editedQuestion) return stateWithHistory;
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((section, sIdx) => {
          if (sIdx === stateWithHistory.editingQuestion!.sectionIndex) {
            return {
              ...section,
              questions: section.questions.map((q, qIdx) =>
                qIdx === stateWithHistory.editingQuestion!.questionIndex ? stateWithHistory.editedQuestion! : q
              )
            };
          }
          return section;
        }),
        editingQuestion: null,
        editedQuestion: null
      };
    case 'CANCEL_EDITING':
      return {
        ...stateWithHistory,
        editingQuestion: null,
        editedQuestion: null
      };
    case 'DELETE_QUESTION':
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((section, sIdx) => {
          if (sIdx === action.payload.sectionIndex) {
            return {
              ...section,
              questions: section.questions.filter((_, qIdx) => qIdx !== action.payload.questionIndex)
            };
          }
          return section;
        }).filter(section => section.questions.length > 0)
      };
    case 'UPDATE_QUESTION_TYPE':
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((section, sIdx) => {
          if (sIdx === action.payload.sectionIndex) {
            return {
              ...section,
              questions: section.questions.map((q, qIdx) =>
                qIdx === action.payload.questionIndex
                  ? { ...q, type: action.payload.type, options: action.payload.options }
                  : q
              )
            };
          }
          return section;
        })
      };
    
    // Question options editing
    case 'UPDATE_EDITED_QUESTION_OPTION':
      if (!stateWithHistory.editedQuestion) return stateWithHistory;
      return {
        ...stateWithHistory,
        editedQuestion: {
          ...stateWithHistory.editedQuestion,
          options: stateWithHistory.editedQuestion.options?.map((opt, idx) =>
            idx === action.payload.index ? action.payload.value : opt
          )
        }
      };
    case 'ADD_EDITED_QUESTION_OPTION':
      if (!stateWithHistory.editedQuestion) return stateWithHistory;
      return {
        ...stateWithHistory,
        editedQuestion: {
          ...stateWithHistory.editedQuestion,
          options: [...(stateWithHistory.editedQuestion.options || []), ""]
        }
      };
    case 'REMOVE_EDITED_QUESTION_OPTION':
      if (!stateWithHistory.editedQuestion) return stateWithHistory;
      return {
        ...stateWithHistory,
        editedQuestion: {
          ...stateWithHistory.editedQuestion,
          options: stateWithHistory.editedQuestion.options?.filter((_, idx) => idx !== action.payload)
        }
      };
    
    // Section name editing
    case 'START_EDIT_SECTION_NAME':
      return {
        ...stateWithHistory,
        editingSectionName: action.payload,
        editedSectionName: stateWithHistory.sections[action.payload].name
      };
    case 'SET_EDITED_SECTION_NAME':
      return { ...stateWithHistory, editedSectionName: action.payload };
    case 'SAVE_SECTION_NAME':
      if (stateWithHistory.editingSectionName === null || !stateWithHistory.editedSectionName.trim()) return stateWithHistory;
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((section, idx) =>
          idx === stateWithHistory.editingSectionName
            ? { ...section, name: stateWithHistory.editedSectionName.trim() }
            : section
        ),
        editingSectionName: null,
        editedSectionName: ""
      };
    case 'CANCEL_EDIT_SECTION_NAME':
      return {
        ...stateWithHistory,
        editingSectionName: null,
        editedSectionName: ""
      };
    
    // Feedback
    case 'TOGGLE_FEEDBACK':
      if (stateWithHistory.showingFeedback?.sectionIndex === action.payload.sectionIndex &&
          stateWithHistory.showingFeedback?.questionIndex === action.payload.questionIndex) {
        return {
          ...stateWithHistory,
          showingFeedback: null,
          selectedQuestions: []
        };
      }
      return {
        ...stateWithHistory,
        showingFeedback: action.payload,
        selectedQuestions: []
      };
    case 'SAVE_FEEDBACK':
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((section, sIdx) => {
          if (sIdx === action.payload.sectionIndex) {
            return {
              ...section,
              questions: section.questions.map((q, qIdx) =>
                qIdx === action.payload.questionIndex ? { ...q, feedback: action.payload.feedback } : q
              )
            };
          }
          return section;
        })
      };
    case 'SET_SELECTED_QUESTIONS':
      return { ...stateWithHistory, selectedQuestions: action.payload };
    case 'TOGGLE_QUESTION_SELECTION':
      const exists = stateWithHistory.selectedQuestions.some(
        sq => sq.sectionIndex === action.payload.sectionIndex && sq.questionIndex === action.payload.questionIndex
      );
      return {
        ...stateWithHistory,
        selectedQuestions: exists
          ? stateWithHistory.selectedQuestions.filter(
              sq => !(sq.sectionIndex === action.payload.sectionIndex && sq.questionIndex === action.payload.questionIndex)
            )
          : [...stateWithHistory.selectedQuestions, action.payload]
      };
    case 'UPDATE_QUESTION_WITH_FEEDBACK':
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((section, sIdx) => {
          if (sIdx === action.payload.sectionIndex) {
            return {
              ...section,
              questions: section.questions.map((q, qIdx) =>
                qIdx === action.payload.questionIndex
                  ? { ...action.payload.question, section: section.name, feedback: q.feedback }
                  : q
              )
            };
          }
          return section;
        })
      };
    
    // Dialogs
    case 'SET_ADDING_SECTION_MANUALLY':
      return { ...stateWithHistory, addingSectionManually: action.payload };
    case 'SET_ADDING_SECTION_DIALOG':
      return { ...stateWithHistory, addingSectionDialog: action.payload };
    case 'SET_SHOW_SAVE_DIALOG':
      return { ...stateWithHistory, showSaveDialog: action.payload };
    case 'SET_SHOW_PREVIEW':
      return { ...stateWithHistory, showPreview: action.payload };
    case 'SET_SHOW_MORE_QUESTIONS_DIALOG':
      return { ...stateWithHistory, showMoreQuestionsDialog: action.payload };
    case 'SET_SHOW_SELECT_QUESTIONS_DIALOG':
      return { ...stateWithHistory, showSelectQuestionsDialog: action.payload };
    
    // New section form
    case 'SET_NEW_SECTION_NAME':
      return { ...stateWithHistory, newSectionName: action.payload };
    case 'SET_NEW_SECTION_TITLE':
      return { ...stateWithHistory, newSectionTitle: action.payload };
    case 'SET_NEW_SECTION_DESCRIPTION':
      return { ...stateWithHistory, newSectionDescription: action.payload };
    case 'SET_NEW_SECTION_LANGUAGE':
      return { ...stateWithHistory, newSectionLanguage: action.payload };
    case 'SET_NEW_SECTION_QUESTION_COUNT':
      return { ...stateWithHistory, newSectionQuestionCount: action.payload };
    case 'RESET_NEW_SECTION_FORM':
      return {
        ...stateWithHistory,
        newSectionTitle: "",
        newSectionDescription: "",
        newSectionLanguage: "it",
        newSectionQuestionCount: null,
        addingSectionDialog: false
      };
    
    // More questions form
    case 'SET_CURRENT_SECTION_FOR_MORE':
      return { ...stateWithHistory, currentSectionForMore: action.payload };
    case 'SET_NEW_MODEL_DESCRIPTION':
      return { ...stateWithHistory, newModelDescription: action.payload };
    case 'SET_MORE_QUESTIONS_COUNT':
      return { ...stateWithHistory, moreQuestionsCount: action.payload };
    case 'RESET_MORE_QUESTIONS_FORM':
      return {
        ...stateWithHistory,
        newModelDescription: "",
        moreQuestionsCount: null
      };
    
    // Combined actions
    case 'ADD_QUESTIONS_TO_SECTION':
      return {
        ...stateWithHistory,
        sections: stateWithHistory.sections.map((s, idx) =>
          idx === action.payload.sectionIndex
            ? { ...s, questions: [...s.questions, ...action.payload.questions] }
            : s
        )
      };
    case 'RESET_GENERATION_FORM':
      return {
        ...stateWithHistory,
        description: "",
        sectionName: "",
        uploadedFile: null,
        questionCount: null
      };
    
    // History actions
    case 'UNDO':
      if (stateWithHistory.historyIndex > 0) {
        const newIndex = stateWithHistory.historyIndex - 1;
        return {
          ...stateWithHistory,
          sections: JSON.parse(JSON.stringify(stateWithHistory.history[newIndex])),
          historyIndex: newIndex
        };
      }
      return stateWithHistory;
    
    case 'REDO':
      if (stateWithHistory.historyIndex < stateWithHistory.history.length - 1) {
        const newIndex = stateWithHistory.historyIndex + 1;
        return {
          ...stateWithHistory,
          sections: JSON.parse(JSON.stringify(stateWithHistory.history[newIndex])),
          historyIndex: newIndex
        };
      }
      return stateWithHistory;
    
    default:
      return stateWithHistory;
  }
}

export function useSurveyState(editingSurvey?: any) {
  const initialSections = editingSurvey?.sections || [];
  const initialState: SurveyState = {
    // Form inputs
    description: "",
    sectionName: "",
    language: editingSurvey?.language || "it",
    questionCount: null,
    
    // Generation states
    generatingMore: null,
    isGenerating: false,
    generatingNewSection: false,
    applyingFeedback: false,
    
    // Data
    sections: initialSections,
    uploadedFile: null,
    currentDraftId: editingSurvey?.id || null,
    isSaving: false,
    
    // Editing states
    editingQuestion: null,
    editedQuestion: null,
    editingSectionName: null,
    editedSectionName: "",
    
    // Feedback states
    showingFeedback: null,
    selectedQuestions: [],
    
    // Dialog states
    addingSectionManually: false,
    addingSectionDialog: false,
    showSaveDialog: false,
    showPreview: false,
    showMoreQuestionsDialog: false,
    showSelectQuestionsDialog: false,
    
    // New section form
    newSectionName: "",
    newSectionTitle: "",
    newSectionDescription: "",
    newSectionLanguage: "it",
    newSectionQuestionCount: null,
    
    // More questions form
    currentSectionForMore: null,
    newModelDescription: "",
    moreQuestionsCount: null,
    
    // History management
    history: initialSections.length > 0 ? [JSON.parse(JSON.stringify(initialSections))] : [],
    historyIndex: initialSections.length > 0 ? 0 : -1,
  };

  return useReducer(surveyReducer, initialState);
}
