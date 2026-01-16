import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ActivateAccountRequest {
  userId: string;
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const { userId, code }: ActivateAccountRequest = await req.json();

    if (!userId || !code) {
      return new Response(
        JSON.stringify({ error: 'User ID and code are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize code
    const normalizedCode = code.trim().toUpperCase();

    // Check if user exists and is pending
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, status')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur introuvable' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (user.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'Compte déjà activé' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (user.status === 'blocked') {
      return new Response(
        JSON.stringify({ error: 'Compte bloqué' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if code exists and is valid
    const { data: activationCode, error: codeError } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (codeError || !activationCode) {
      return new Response(
        JSON.stringify({ error: 'Code d\'activation invalide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if code is already used
    if (activationCode.used) {
      return new Response(
        JSON.stringify({ error: 'Ce code a déjà été utilisé' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(activationCode.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Ce code a expiré' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update activation code as used
    const { error: updateCodeError } = await supabase
      .from('activation_codes')
      .update({
        used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('code', normalizedCode);

    if (updateCodeError) {
      console.error('Error updating activation code:', updateCodeError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'activation' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update user status to active
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateUserError) {
      console.error('Error updating user:', updateUserError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'activation du compte' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte activé avec succès !',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne du serveur' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});