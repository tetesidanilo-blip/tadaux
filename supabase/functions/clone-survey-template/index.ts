import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// SECURITY: Input validation schema to prevent injection attacks
const CloneRequestSchema = z.object({
  templateId: z.string().uuid("Invalid template ID format"),
  customTitle: z.string().min(1).max(200, "Title too long").optional()
}).strict();

// Dynamic CORS whitelist
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  // Fallback per sviluppo locale
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
  if (isDev) {
    return ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];
  }
  return [];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && (allowedOrigins.includes(origin) || allowedOrigins.length === 0);
  
  if (!isAllowed && origin) {
    console.warn(`[CORS] Rejected origin: ${origin}`);
  }
  
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : (allowedOrigins[0] || '*'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true'
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 1. Autentica utente
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // SECURITY: Validate input before processing
    const rawBody = await req.json()
    const validationResult = CloneRequestSchema.safeParse(rawBody)
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.format())
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { templateId, customTitle } = validationResult.data

    console.log(`[Clone] User ${user.id} checking permissions for template ${templateId}`)

    // 2. Recupera dati profilo e template in parallelo
    const [profileResult, templateResult] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('subscription_tier, credits')
        .eq('id', user.id)
        .single(),
      supabaseClient
        .from('survey_templates')
        .select('credit_price, is_free, creator_id')
        .eq('id', templateId)
        .single()
    ])

    if (profileResult.error) {
      console.error('[Clone] Profile fetch error:', profileResult.error)
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user profile',
        details: profileResult.error.message
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (templateResult.error) {
      console.error('[Clone] Template fetch error:', templateResult.error)
      return new Response(JSON.stringify({ 
        error: 'Template not found',
        details: templateResult.error.message
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const profile = profileResult.data
    const template = templateResult.data

    // 3. Verifica che non stia clonando il proprio template
    if (template.creator_id === user.id) {
      console.log(`[Clone] User ${user.id} attempted to clone own template`)
      return new Response(JSON.stringify({ 
        error: 'Cannot clone your own template' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 4. Controllo permessi basato su tier e crediti
    const requiredCredits = template.is_free ? 0 : template.credit_price
    const hasProAccess = ['pro', 'business'].includes(profile.subscription_tier)

    console.log(`[Clone] Permission check - Tier: ${profile.subscription_tier}, Credits: ${profile.credits}/${requiredCredits}, Free: ${template.is_free}`)

    // Logica di autorizzazione
    if (!template.is_free && !hasProAccess && profile.credits < requiredCredits) {
      console.log(`[Clone] Insufficient credits - Required: ${requiredCredits}, Available: ${profile.credits}`)
      return new Response(JSON.stringify({
        error: 'Insufficient credits',
        required: requiredCredits,
        available: profile.credits,
        message: `Servono ${requiredCredits} crediti per clonare questo template. Hai solo ${profile.credits} crediti disponibili.`
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Clone] Authorization passed - proceeding with clone`)

    // 5. Chiama la funzione atomica PostgreSQL (singola transazione ACID)
    const { data: result, error: cloneError } = await supabaseClient.rpc('clone_template_atomic', {
      _template_id: templateId,
      _cloner_id: user.id,
      _custom_title: customTitle || null
    })

    if (cloneError) {
      console.error('Clone RPC error:', cloneError)
      return new Response(JSON.stringify({ 
        error: 'Failed to clone template',
        details: cloneError.message
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 3. Gestisci il risultato della funzione atomica
    if (!result.success) {
      const errorType = result.error
      console.log(`[Clone] Failed: ${errorType}`)
      
      // Gestisci errore crediti insufficienti
      if (errorType === 'Insufficient credits') {
        return new Response(JSON.stringify({
          error: errorType,
          required: result.required,
          available: result.available
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Altri errori
      const statusCode = errorType === 'Cannot clone your own template' ? 400 : 404
      return new Response(JSON.stringify({ 
        error: result.error 
      }), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Successo - ritorna dati del survey clonato
    console.log(`[Clone] Success: ${result.survey_id}, credits spent: ${result.credits_spent}`)
    return new Response(JSON.stringify({
      success: true,
      clonedSurvey: {
        id: result.survey_id
      },
      creditsSpent: result.credits_spent
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: errorMessage
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
