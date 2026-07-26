/**
 * lib/env.js
 *
 * Environment variable validation helper for server-side initialization.
 * Logs clear diagnostic messages when critical keys are missing or invalid.
 */

export function validateServerEnv() {
  const issues = [];

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    issues.push('CRITICAL: Neither GROQ_API_KEY nor GEMINI_API_KEY is configured. AI generation will fail.');
  } else {
    if (!groqKey) {
      console.warn('⚠️ GROQ_API_KEY missing — AI routes will rely solely on Gemini fallback.');
    }
    if (!geminiKey) {
      console.warn('⚠️ GEMINI_API_KEY missing — AI routes will rely solely on Groq primary.');
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials missing — database session saving and history will be disabled.');
  }

  return {
    valid: issues.length === 0,
    issues,
    hasGroq: !!groqKey,
    hasGemini: !!geminiKey,
    hasSupabase: !!(supabaseUrl && supabaseKey),
  };
}
