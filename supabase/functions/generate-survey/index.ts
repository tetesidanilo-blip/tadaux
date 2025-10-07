import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, hasDocument, language = 'en', refineQuestion } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating survey for:', description || refineQuestion, 'Language:', language);

    const languageNames: Record<string, string> = {
      'it': 'Italian',
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'nl': 'Dutch',
      'pl': 'Polish',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    };

    const targetLanguage = languageNames[language] || 'English';

    let systemPrompt: string;
    let userPrompt: string;

    if (refineQuestion) {
      // Mode: refine a single question based on feedback
      systemPrompt = `You are an expert survey designer. You will refine an existing survey question based on user feedback.

IMPORTANT: Generate the refined question and options in ${targetLanguage}.

Return a JSON object with a "questions" array containing ONLY ONE refined question with:
- question: The refined question text (in ${targetLanguage})
- type: "${refineQuestion.type}"
- options: Array of refined options (in ${targetLanguage}, only if the original had options)
- required: Boolean (same as original)

Apply the user's feedback to improve the question while maintaining its core purpose.`;

      userPrompt = `Original question: "${refineQuestion.question}"
Type: ${refineQuestion.type}
${refineQuestion.options ? `Options: ${refineQuestion.options.join(', ')}` : ''}

User feedback: "${refineQuestion.feedback}"

Refine this question based on the feedback. Keep it in ${targetLanguage}.`;
    } else {
      // Mode: generate new questions
      systemPrompt = `You are an expert survey designer. Generate professional survey questions based on the user's requirements.

IMPORTANT: Generate ALL questions and options in ${targetLanguage}.

Return a JSON object with a "questions" array. Each question should have:
- question: The question text (in ${targetLanguage})
- type: One of: "multiple_choice", "checkbox", "short_answer", "paragraph", "dropdown"
- options: Array of options (in ${targetLanguage}, only for multiple_choice, checkbox, or dropdown)
- required: Boolean indicating if the question is required

Generate 5-10 relevant questions based on the input.`;

      userPrompt = hasDocument 
        ? `Convert this document content into survey questions in ${targetLanguage}: ${description}\n\nExtract key topics and create survey questions that would gather feedback or information about the document's subject matter.`
        : `Create a Google Forms survey in ${targetLanguage} based on this request: ${description}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', data);
    
    const content = data.choices[0].message.content;
    const surveyData = JSON.parse(content);

    return new Response(
      JSON.stringify(surveyData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in generate-survey function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        questions: [] 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
