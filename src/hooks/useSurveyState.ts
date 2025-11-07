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
  | { type: 'RESET_GENERATION_FORM' };

export function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  switch (action.type) {
    // Form updates
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    case 'SET_SECTION_NAME':
      return { ...state, sectionName: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_QUESTION_COUNT':
      return { ...state, questionCount: action.payload };
    
    // Generation states
    case 'SET_GENERATING_MORE':
      return { ...state, generatingMore: action.payload };
    case 'SET_IS_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_GENERATING_NEW_SECTION':
      return { ...state, generatingNewSection: action.payload };
    case 'SET_APPLYING_FEEDBACK':
      return { ...state, applyingFeedback: action.payload };
    
    // Data updates
    case 'SET_SECTIONS':
      return { ...state, sections: action.payload };
    case 'ADD_SECTION':
      return { ...state, sections: [...state.sections, action.payload] };
    case 'UPDATE_SECTION':
      return {
        ...state,
        sections: state.sections.map((section, idx) =>
          idx === action.payload.index ? action.payload.section : section
        )
      };
    case 'REMOVE_SECTION':
      return {
        ...state,
        sections: state.sections.filter(s => s.name !== action.payload)
      };
    case 'CLEAR_SECTIONS':
      return { ...state, sections: [] };
    case 'SET_UPLOADED_FILE':
      return { ...state, uploadedFile: action.payload };
    case 'SET_CURRENT_DRAFT_ID':
      return { ...state, currentDraftId: action.payload };
    case 'SET_IS_SAVING':
      return { ...state, isSaving: action.payload };
    
    // Question editing
    case 'START_EDIT_QUESTION':
      return {
        ...state,
        editingQuestion: action.payload,
        editedQuestion: { ...state.sections[action.payload.sectionIndex].questions[action.payload.questionIndex] }
      };
    case 'SET_EDITED_QUESTION':
      return { ...state, editedQuestion: action.payload };
    case 'UPDATE_EDITED_QUESTION':
      return {
        ...state,
        editedQuestion: state.editedQuestion ? { ...state.editedQuestion, ...action.payload } : null
      };
    case 'SAVE_EDITED_QUESTION':
      if (!state.editingQuestion || !state.editedQuestion) return state;
      return {
        ...state,
        sections: state.sections.map((section, sIdx) => {
          if (sIdx === state.editingQuestion!.sectionIndex) {
            return {
              ...section,
              questions: section.questions.map((q, qIdx) =>
                qIdx === state.editingQuestion!.questionIndex ? state.editedQuestion! : q
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
        ...state,
        editingQuestion: null,
        editedQuestion: null
      };
    case 'DELETE_QUESTION':
      return {
        ...state,
        sections: state.sections.map((section, sIdx) => {
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
        ...state,
        sections: state.sections.map((section, sIdx) => {
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
      if (!state.editedQuestion) return state;
      return {
        ...state,
        editedQuestion: {
          ...state.editedQuestion,
          options: state.editedQuestion.options?.map((opt, idx) =>
            idx === action.payload.index ? action.payload.value : opt
          )
        }
      };
    case 'ADD_EDITED_QUESTION_OPTION':
      if (!state.editedQuestion) return state;
      return {
        ...state,
        editedQuestion: {
          ...state.editedQuestion,
          options: [...(state.editedQuestion.options || []), ""]
        }
      };
    case 'REMOVE_EDITED_QUESTION_OPTION':
      if (!state.editedQuestion) return state;
      return {
        ...state,
        editedQuestion: {
          ...state.editedQuestion,
          options: state.editedQuestion.options?.filter((_, idx) => idx !== action.payload)
        }
      };
    
    // Section name editing
    case 'START_EDIT_SECTION_NAME':
      return {
        ...state,
        editingSectionName: action.payload,
        editedSectionName: state.sections[action.payload].name
      };
    case 'SET_EDITED_SECTION_NAME':
      return { ...state, editedSectionName: action.payload };
    case 'SAVE_SECTION_NAME':
      if (state.editingSectionName === null || !state.editedSectionName.trim()) return state;
      return {
        ...state,
        sections: state.sections.map((section, idx) =>
          idx === state.editingSectionName
            ? { ...section, name: state.editedSectionName.trim() }
            : section
        ),
        editingSectionName: null,
        editedSectionName: ""
      };
    case 'CANCEL_EDIT_SECTION_NAME':
      return {
        ...state,
        editingSectionName: null,
        editedSectionName: ""
      };
    
    // Feedback
    case 'TOGGLE_FEEDBACK':
      if (state.showingFeedback?.sectionIndex === action.payload.sectionIndex &&
          state.showingFeedback?.questionIndex === action.payload.questionIndex) {
        return {
          ...state,
          showingFeedback: null,
          selectedQuestions: []
        };
      }
      return {
        ...state,
        showingFeedback: action.payload,
        selectedQuestions: []
      };
    case 'SAVE_FEEDBACK':
      return {
        ...state,
        sections: state.sections.map((section, sIdx) => {
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
      return { ...state, selectedQuestions: action.payload };
    case 'TOGGLE_QUESTION_SELECTION':
      const exists = state.selectedQuestions.some(
        sq => sq.sectionIndex === action.payload.sectionIndex && sq.questionIndex === action.payload.questionIndex
      );
      return {
        ...state,
        selectedQuestions: exists
          ? state.selectedQuestions.filter(
              sq => !(sq.sectionIndex === action.payload.sectionIndex && sq.questionIndex === action.payload.questionIndex)
            )
          : [...state.selectedQuestions, action.payload]
      };
    case 'UPDATE_QUESTION_WITH_FEEDBACK':
      return {
        ...state,
        sections: state.sections.map((section, sIdx) => {
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
      return { ...state, addingSectionManually: action.payload };
    case 'SET_ADDING_SECTION_DIALOG':
      return { ...state, addingSectionDialog: action.payload };
    case 'SET_SHOW_SAVE_DIALOG':
      return { ...state, showSaveDialog: action.payload };
    case 'SET_SHOW_PREVIEW':
      return { ...state, showPreview: action.payload };
    case 'SET_SHOW_MORE_QUESTIONS_DIALOG':
      return { ...state, showMoreQuestionsDialog: action.payload };
    case 'SET_SHOW_SELECT_QUESTIONS_DIALOG':
      return { ...state, showSelectQuestionsDialog: action.payload };
    
    // New section form
    case 'SET_NEW_SECTION_NAME':
      return { ...state, newSectionName: action.payload };
    case 'SET_NEW_SECTION_TITLE':
      return { ...state, newSectionTitle: action.payload };
    case 'SET_NEW_SECTION_DESCRIPTION':
      return { ...state, newSectionDescription: action.payload };
    case 'SET_NEW_SECTION_LANGUAGE':
      return { ...state, newSectionLanguage: action.payload };
    case 'SET_NEW_SECTION_QUESTION_COUNT':
      return { ...state, newSectionQuestionCount: action.payload };
    case 'RESET_NEW_SECTION_FORM':
      return {
        ...state,
        newSectionTitle: "",
        newSectionDescription: "",
        newSectionLanguage: "it",
        newSectionQuestionCount: null,
        addingSectionDialog: false
      };
    
    // More questions form
    case 'SET_CURRENT_SECTION_FOR_MORE':
      return { ...state, currentSectionForMore: action.payload };
    case 'SET_NEW_MODEL_DESCRIPTION':
      return { ...state, newModelDescription: action.payload };
    case 'SET_MORE_QUESTIONS_COUNT':
      return { ...state, moreQuestionsCount: action.payload };
    case 'RESET_MORE_QUESTIONS_FORM':
      return {
        ...state,
        newModelDescription: "",
        moreQuestionsCount: null
      };
    
    // Combined actions
    case 'ADD_QUESTIONS_TO_SECTION':
      return {
        ...state,
        sections: state.sections.map((s, idx) =>
          idx === action.payload.sectionIndex
            ? { ...s, questions: [...s.questions, ...action.payload.questions] }
            : s
        )
      };
    case 'RESET_GENERATION_FORM':
      return {
        ...state,
        description: "",
        sectionName: "",
        uploadedFile: null,
        questionCount: null
      };
    
    default:
      return state;
  }
}

export function useSurveyState(editingSurvey?: any) {
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
    sections: editingSurvey?.sections || [],
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
  };

  return useReducer(surveyReducer, initialState);
}
