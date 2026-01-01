import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GenerateSurveyParams {
  description: string;
  hasDocument: boolean;
  language: string;
  questionCount?: number | null;
}

interface RefineQuestionParams {
  question: string;
  feedback: string;
  type: string;
  options?: string[];
  language: string;
}

interface GenerateMoreQuestionsParams {
  description: string;
  language: string;
  questionCount?: number;
}

interface RefineBatchQuestionsParams {
  questions: Array<{
    question: string;
    feedback: string;
    type: string;
    options?: string[];
  }>;
  language: string;
}

export const useSurveyActions = () => {
  // 1. Mutazione: Genera Survey iniziale
  const generateSurvey = useMutation({
    mutationFn: async (params: GenerateSurveyParams) => {
      // Build body, omitting questionCount if null/undefined (for "Automatic" mode)
      const body: Record<string, unknown> = {
        description: params.description,
        hasDocument: params.hasDocument,
        language: params.language,
      };
      if (params.questionCount != null) {
        body.questionCount = params.questionCount;
      }

      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body,
      });

      if (error) throw error;
      return data;
    },
  });

  // 2. Mutazione: Genera più domande
  const generateMoreQuestions = useMutation({
    mutationFn: async (params: GenerateMoreQuestionsParams) => {
      // Build body, omitting questionCount if null/undefined
      const body: Record<string, unknown> = {
        description: params.description,
        hasDocument: false,
        language: params.language,
      };
      if (params.questionCount != null) {
        body.questionCount = params.questionCount;
      }

      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body,
      });

      if (error) throw error;
      return data;
    },
  });

  // 3. Mutazione: Refine singola domanda
  const refineQuestion = useMutation({
    mutationFn: async (params: RefineQuestionParams) => {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: {
          refineQuestion: {
            question: params.question,
            feedback: params.feedback,
            type: params.type,
            options: params.options,
          },
          language: params.language,
        },
      });

      if (error) throw error;
      return data;
    },
  });

  // 4. Mutazione: Refine batch domande (PARALLELO)
  const refineBatchQuestions = useMutation({
    mutationFn: async (params: RefineBatchQuestionsParams) => {
      // Esegue tutte le richieste in parallelo invece che in sequenza
      const results = await Promise.all(
        params.questions.map(async (q) => {
          const { data, error } = await supabase.functions.invoke("generate-survey", {
            body: {
              refineQuestion: q,
              language: params.language,
            },
          });

          if (error) throw error;
          return data;
        })
      );

      return results;
    },
  });

  return {
    generateSurvey,
    generateMoreQuestions,
    refineQuestion,
    refineBatchQuestions,
  };
};
