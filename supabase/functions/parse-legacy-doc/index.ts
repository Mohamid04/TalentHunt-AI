import { Buffer } from 'node:buffer';
import { createClient } from 'npm:@supabase/supabase-js@2';
import WordExtractor from 'npm:word-extractor@1.0.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !anonKey) return jsonResponse({ error: 'Authentication is required.' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Authentication is required.' }, 401);

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.doc')) {
      return jsonResponse({ error: 'Upload one legacy .doc file.' }, 400);
    }
    if (file.size === 0 || file.size > 8 * 1024 * 1024) {
      return jsonResponse({ error: 'The document must be between 1 byte and 8 MB.' }, 413);
    }

    const extractor = new WordExtractor();
    const document = await extractor.extract(Buffer.from(await file.arrayBuffer()));
    const text = document.getBody();
    if (!text.trim()) return jsonResponse({ error: 'No readable text was found in this document.' }, 422);
    return jsonResponse({ text });
  } catch {
    return jsonResponse({ error: 'The DOC file could not be parsed. Try saving it as DOCX or PDF.' }, 422);
  }
});