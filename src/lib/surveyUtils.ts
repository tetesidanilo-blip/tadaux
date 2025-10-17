export const normalizeSurveyData = (survey: any) => {
  if (!survey || !survey.sections) {
    return survey;
  }

  return {
    ...survey,
    sections: survey.sections.map((section: any) => ({
      ...section,
      questions: section.questions?.map((q: any) => ({
        text: q.text || q.question, // Handles both 'text' and 'question' field names
        type: q.type,
        options: q.options,
        required: q.required,
        section: q.section
      })) || []
    }))
  };
};
