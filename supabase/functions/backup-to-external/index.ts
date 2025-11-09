import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get local Supabase client (Lovable Cloud)
    const localSupabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const localSupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localClient = createClient(localSupabaseUrl, localSupabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await localClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Starting backup for user: ${user.id}`);

    // Get external Supabase client
    const externalSupabaseUrl = 'https://wnehlqsibqgzydkteptf.supabase.co';
    const externalSupabaseKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')!;
    const externalClient = createClient(externalSupabaseUrl, externalSupabaseKey);

    const results = {
      profiles: { success: 0, errors: 0 },
      surveys: { success: 0, errors: 0 },
      survey_responses: { success: 0, errors: 0 },
      credit_transactions: { success: 0, errors: 0 },
    };

    // 1. BACKUP PROFILES
    console.log('Backing up profiles...');
    const { data: profiles, error: profilesError } = await localClient
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      results.profiles.errors++;
    } else if (profiles) {
      for (const profile of profiles) {
        const { error: upsertError } = await externalClient
          .from('profiles')
          .upsert(profile, { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Error upserting profile:', upsertError);
          results.profiles.errors++;
        } else {
          results.profiles.success++;
        }
      }
    }

    // 2. BACKUP SURVEYS
    console.log('Backing up surveys...');
    const { data: surveys, error: surveysError } = await localClient
      .from('surveys')
      .select('*');

    if (surveysError) {
      console.error('Error fetching surveys:', surveysError);
      results.surveys.errors++;
    } else if (surveys) {
      for (const survey of surveys) {
        const { error: upsertError } = await externalClient
          .from('surveys')
          .upsert(survey, { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Error upserting survey:', upsertError);
          results.surveys.errors++;
        } else {
          results.surveys.success++;
        }
      }
    }

    // 3. BACKUP SURVEY_RESPONSES
    console.log('Backing up survey responses...');
    const { data: responses, error: responsesError } = await localClient
      .from('survey_responses')
      .select('*');

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      results.survey_responses.errors++;
    } else if (responses) {
      for (const response of responses) {
        const { error: upsertError } = await externalClient
          .from('survey_responses')
          .upsert(response, { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Error upserting response:', upsertError);
          results.survey_responses.errors++;
        } else {
          results.survey_responses.success++;
        }
      }
    }

    // 4. BACKUP CREDIT_TRANSACTIONS
    console.log('Backing up credit transactions...');
    const { data: transactions, error: transactionsError } = await localClient
      .from('credit_transactions')
      .select('*');

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      results.credit_transactions.errors++;
    } else if (transactions) {
      for (const transaction of transactions) {
        const { error: upsertError } = await externalClient
          .from('credit_transactions')
          .upsert(transaction, { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Error upserting transaction:', upsertError);
          results.credit_transactions.errors++;
        } else {
          results.credit_transactions.success++;
        }
      }
    }

    console.log('Backup completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backup completed successfully',
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in backup-to-external function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
