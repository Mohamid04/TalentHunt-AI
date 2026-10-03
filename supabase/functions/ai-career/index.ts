import { createClient } from 'npm:@supabase/supabase-js@2';
import { callCareerAI, type CareerAiTask } from '../_shared/ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const allowedTasks: CareerAiTask[] = ['parse_resume', 'analyze_resume', 'extract_skills', 'match_job', 'analyze_skill_gaps', 'generate_roadmap', 'improve_resume', 'generate_cover_letter', 'generate_interview_questions', 'evaluate_mock_interview'];

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
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return jsonResponse({ error: 'Authentication is required.' }, 401);

  try {
    const body = await request.json();
    const task = body?.task as CareerAiTask;
    if (!allowedTasks.includes(task)) return jsonResponse({ error: 'Unsupported AI task.' }, 400);
    const input = body?.input;
    const serialized = JSON.stringify(input ?? {});
    if (serialized.length > 100000) return jsonResponse({ error: 'AI input is too large.' }, 413);
    const result = await callCareerAI(task, input, user.id);
    return jsonResponse({ task, result });
  } catch (requestError) {
    const message = requestError instanceof Error ? requestError.message : 'AI request failed.';
    const status = message.includes('not configured') ? 503 : message.includes('Too many') ? 429 : 422;
    return jsonResponse({ error: status === 503 ? message : 'AI request failed. Check the supplied evidence and try again.' }, status);
  }
});
