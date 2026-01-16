import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ActivateCodeRequest {
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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { code }: ActivateCodeRequest = await req.json();

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Code d\'activation requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.trim().toUpperCase();

    // Check if code exists and is valid
    const { data: activationCode, error: codeError } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

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
        used_by: user.id,
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

    // Update user profile to active
    const { error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError);
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