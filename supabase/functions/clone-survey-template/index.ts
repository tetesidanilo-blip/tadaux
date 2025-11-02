import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

interface CloneRequest {
  templateId: string
  customTitle?: string
}

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

    const { templateId, customTitle }: CloneRequest = await req.json()

    console.log(`[Clone] User ${user.id} cloning template ${templateId}`)

    // 2. Ottieni template e survey originale
    const { data: template, error: templateError } = await supabaseClient
      .from('survey_templates')
      .select(`
        *,
        surveys!inner(*)
      `)
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      console.error('Template not found:', templateError)
      return new Response(JSON.stringify({ error: 'Template not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 3. Verifica crediti utente
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('credits, subscription_tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return new Response(JSON.stringify({ error: 'Profile not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Verifica saldo
    if (!template.is_free && profile.credits < template.credit_price) {
      console.log(`Insufficient credits: required ${template.credit_price}, available ${profile.credits}`)
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: template.credit_price,
        available: profile.credits
      }), { 
        status: 402, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 4. PREVENT SELF-CLONE
    if (template.creator_id === user.id) {
      console.log(`[Clone] User ${user.id} attempted to clone own template ${templateId}`)
      return new Response(JSON.stringify({ 
        error: 'Cannot clone your own template',
        message: 'You cannot purchase your own templates'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 5. Clona il survey
    const originalSurvey = template.surveys
    const newShareToken = crypto.randomUUID()
    const clonedTitle = customTitle?.trim() || `${originalSurvey.title} (Copia)`
    
    let clonedSurvey: any = null
    let creditsDebited = false
    const creatorReward = profile.subscription_tier === 'free' ? 10 : 20
    
    try {
      // Step 1: Clone survey
      const { data: survey, error: cloneError } = await supabaseClient
        .from('surveys')
        .insert({
          user_id: user.id,
          title: clonedTitle,
          description: originalSurvey.description,
          sections: originalSurvey.sections,
          language: originalSurvey.language,
          share_token: newShareToken,
          status: 'draft',
          is_active: false,
          expires_at: null,
          visible_in_community: profile.subscription_tier === 'free',
          responses_public: false
        })
        .select()
        .single()

      if (cloneError) {
        console.error('Clone error:', cloneError)
        throw new Error(`Failed to clone survey: ${cloneError.message}`)
      }

      clonedSurvey = survey
      console.log(`[Clone] Survey cloned successfully: ${clonedSurvey.id}`)

      // Step 2: Debit credits (con rollback automatico in caso di errore)
      if (!template.is_free) {
        const { error: debitError } = await supabaseClient.rpc('update_user_credits', {
          _user_id: user.id,
          _amount: -template.credit_price,
          _transaction_type: 'template_purchased',
          _reference_id: templateId,
          _description: `Acquistato template: ${originalSurvey.title}`
        })

        if (debitError) {
          console.error('Debit error:', debitError)
          throw new Error(`Failed to debit credits: ${debitError.message}`)
        }
        
        creditsDebited = true
        console.log(`[Credits] Debited ${template.credit_price} from ${user.id}`)
      }

      // Step 3: Credit creator
      const { error: creditError } = await supabaseClient.rpc('update_user_credits', {
        _user_id: template.creator_id,
        _amount: creatorReward,
        _transaction_type: 'template_used',
        _reference_id: templateId,
        _description: `Template utilizzato: ${originalSurvey.title}`
      })

      if (creditError) {
        console.error('Credit error:', creditError)
        throw new Error(`Failed to credit creator: ${creditError.message}`)
      }
      
      console.log(`[Credits] Credited ${creatorReward} to creator ${template.creator_id}`)

      // Step 4: Update template stats
      const { error: statsError } = await supabaseClient
        .from('survey_templates')
        .update({ 
          times_cloned: template.times_cloned + 1,
          total_credits_earned: template.total_credits_earned + (template.is_free ? 0 : template.credit_price),
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (statsError) {
        console.error('Stats update error:', statsError)
        throw new Error(`Failed to update template stats: ${statsError.message}`)
      }

      // Step 5: Register clone tracking
      const { error: trackingError } = await supabaseClient
        .from('survey_clones')
        .insert({
          template_id: templateId,
          cloned_survey_id: clonedSurvey.id,
          cloner_id: user.id,
          original_creator_id: template.creator_id,
          credits_paid: template.is_free ? 0 : template.credit_price
        })

      if (trackingError) {
        console.error('Tracking error:', trackingError)
        throw new Error(`Failed to register clone tracking: ${trackingError.message}`)
      }

      console.log(`[Clone] Transaction completed successfully`)
      
    } catch (error) {
      console.error('ROLLBACK: Transaction failed, reverting changes...', error)
      
      // ROLLBACK: Delete cloned survey if it was created
      if (clonedSurvey) {
        const { error: deleteError } = await supabaseClient
          .from('surveys')
          .delete()
          .eq('id', clonedSurvey.id)
        
        if (deleteError) {
          console.error('CRITICAL: Failed to delete cloned survey during rollback', deleteError)
        } else {
          console.log(`[Rollback] Deleted cloned survey ${clonedSurvey.id}`)
        }
      }
      
      // ROLLBACK: Refund credits if they were debited
      if (creditsDebited) {
        const { error: refundError } = await supabaseClient.rpc('update_user_credits', {
          _user_id: user.id,
          _amount: template.credit_price,
          _transaction_type: 'refund',
          _reference_id: templateId,
          _description: `Rimborso per errore clonazione: ${originalSurvey.title}`
        })
        
        if (refundError) {
          console.error('CRITICAL: Failed to refund credits during rollback', refundError)
        } else {
          console.log(`[Rollback] Refunded ${template.credit_price} credits to ${user.id}`)
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ 
        error: 'Transaction failed and was rolled back',
        details: errorMessage
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify({ 
      success: true,
      clonedSurvey: {
        id: clonedSurvey.id,
        title: clonedSurvey.title,
        share_token: clonedSurvey.share_token
      },
      creditsSpent: template.is_free ? 0 : template.credit_price,
      creatorRewarded: creatorReward
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
