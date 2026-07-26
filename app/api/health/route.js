/**
 * app/api/health/route.js
 *
 * Production health check endpoint.
 * Returns service status, system environment checks, and timestamp.
 */

import { validateServerEnv } from '../../../lib/env';

export async function GET() {
  const env = validateServerEnv();

  const status = env.valid ? 'ok' : 'degraded';
  const statusCode = env.valid ? 200 : 503;

  return Response.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        groq: env.hasGroq,
        gemini: env.hasGemini,
        supabase: env.hasSupabase,
      },
      issues: env.issues,
    },
    { status: statusCode }
  );
}
