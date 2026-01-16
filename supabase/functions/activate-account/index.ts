import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ActivateAccountRequest {
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { code }: ActivateAccountRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedCode = code.trim().toUpperCase();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (profile.status === 'active') {
      return new Response(
        JSON.stringify({ success: true, message: 'Compte déjà activé' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (profile.status === 'blocked') {
      return new Response(
        JSON.stringify({ error: 'Compte bloqué. Contactez le support.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: activationCode, error: codeError } = await supabaseAdmin
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

    if (activationCode.status === 'used') {
      return new Response(
        JSON.stringify({ error: 'Ce code a déjà été utilisé' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (activationCode.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'Ce code a été révoqué' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const expiresAt = new Date(activationCode.expires_at);
    if (now > expiresAt) {
      await supabaseAdmin
        .from('activation_codes')
        .update({ status: 'expired' })
        .eq('code', normalizedCode);

      return new Response(
        JSON.stringify({ error: 'Ce code a expiré' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: updateCodeError } = await supabaseAdmin
      .from('activation_codes')
      .update({
        status: 'used',
        used_by: authUser.id,
        used_at: now.toISOString(),
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

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'active',
        activated_at: now.toISOString(),
      })
      .eq('id', authUser.id);

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);

      await supabaseAdmin
        .from('activation_codes')
        .update({
          status: 'pending',
          used_by: null,
          used_at: null,
        })
        .eq('code', normalizedCode);

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
