import { createClient } from '@supabase/supabase-js';

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
};

export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export const databasePolicySummary = [
  'Supabase Auth manages sessions; authenticated screens are gated on a valid session.',
  'Only the Supabase publishable/anon key belongs in the browser; never expose a service-role key.',
  'PDF/DOCX/TXT are parsed locally; legacy DOC and consented resume/JD AI comparisons use authenticated Edge Functions. Provider retention terms apply.',
  'Enable Google OAuth and email confirmation in Supabase before using those production flows.',
];
