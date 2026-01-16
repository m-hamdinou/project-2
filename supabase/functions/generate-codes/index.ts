import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Key',
};

interface GenerateCodesRequest {
  count: number;
  expirationDays: number;
  adminKey: string;
}

// Generate a random code avoiding confusing characters
function generateCode(length: number = 8): string {
  // Avoid 0/O and 1/I/l for readability
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
    // Parse request body
    const { count, expirationDays, adminKey }: GenerateCodesRequest = await req.json();

    // Validate admin key
    const expectedAdminKey = Deno.env.get('ADMIN_KEY') || '123456';
    if (!adminKey || adminKey !== expectedAdminKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid admin key' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate inputs
    if (!count || count < 1 || count > 1000) {
      return new Response(
        JSON.stringify({ error: 'Count must be between 1 and 1000' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!expirationDays || expirationDays < 1) {
      return new Response(
        JSON.stringify({ error: 'Expiration days must be at least 1' }),
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

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Generate codes
    const codes: Array<{ code: string; expires_at: string }> = [];
    const generatedCodes = new Set<string>();

    while (generatedCodes.size < count) {
      const code = generateCode(8);
      
      // Check if code already exists in database
      const { data: existingCode } = await supabase
        .from('activation_codes')
        .select('code')
        .eq('code', code)
        .single();

      if (!existingCode && !generatedCodes.has(code)) {
        generatedCodes.add(code);
        codes.push({
          code,
          expires_at: expiresAt.toISOString(),
        });
      }
    }

    // Insert codes into database
    const { data: insertedCodes, error: insertError } = await supabase
      .from('activation_codes')
      .insert(codes)
      .select();

    if (insertError) {
      console.error('Error inserting codes:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert codes into database' }),
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
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});