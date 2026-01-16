import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateCodesRequest {
  count: number;
  expirationDays: number;
}

function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }

  return code;
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Accès refusé. Rôle admin requis.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { count, expirationDays }: GenerateCodesRequest = await req.json();

    if (!count || count < 1 || count > 1000) {
      return new Response(
        JSON.stringify({ error: 'Le nombre doit être entre 1 et 1000' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!expirationDays || expirationDays < 1) {
      return new Response(
        JSON.stringify({ error: 'La durée d\'expiration doit être d\'au moins 1 jour' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const codes: Array<{ code: string; expires_at: string; created_by_admin_id: string }> = [];
    const generatedCodes = new Set<string>();

    while (generatedCodes.size < count) {
      const code = generateCode(8);

      const { data: existingCode } = await supabaseAdmin
        .from('activation_codes')
        .select('code')
        .eq('code', code)
        .maybeSingle();

      if (!existingCode && !generatedCodes.has(code)) {
        generatedCodes.add(code);
        codes.push({
          code,
          expires_at: expiresAt.toISOString(),
          created_by_admin_id: authUser.id,
        });
      }
    }

    const { data: insertedCodes, error: insertError } = await supabaseAdmin
      .from('activation_codes')
      .insert(codes)
      .select();

    if (insertError) {
      console.error('Error inserting codes:', insertError);
      return new Response(
        JSON.stringify({ error: 'Échec de l\'insertion des codes' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedCodes?.length || 0,
        codes: insertedCodes?.map(c => c.code) || [],
        expiresAt: expiresAt.toISOString(),
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
