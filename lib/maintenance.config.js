/**
 * MockPrep Production Maintenance & Deployment Configuration
 * Single source of truth for platform maintenance status, release notes, and system health.
 * Webhook-ready for future Vercel, Railway, or GitHub Actions integrations.
 */

export const MAINTENANCE_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
  status: 'SCHEDULED_MAINTENANCE', // 'SCHEDULED_MAINTENANCE' | 'EMERGENCY_MAINTENANCE' | 'COMPLETED'
  currentVersion: 'v2.3.4',
  targetVersion: 'v2.4.0',
  startedAt: '2026-07-26 13:00 UTC',
  expectedReturnTime: '2026-07-26 14:00 UTC',
  reason: 'Upgrading platform architecture to deliver sub-800ms evaluation latency and upgraded AI model router.',
  
  releaseNotes: [
    { title: 'Premium Interview Studio', desc: 'Upgraded Monaco-style workspace with real-time complexity analysis.' },
    { title: 'New AI Scorecard Experience', desc: 'Structured hiring committee reports with STAR component verification.' },
    { title: 'Sub-800ms Response Speed', desc: 'Upgraded Groq Llama 3.3 70B & Gemini 3.6 Flash router.' },
    { title: 'Enhanced STAR Method Accuracy', desc: 'Automated transcript parsing for Situation, Task, Action, and Result.' },
    { title: 'Performance & Memory Optimizations', desc: 'Reduced client bundle size and optimized memory overhead.' },
    { title: 'Improved Analytics & History', desc: 'Track performance trends, streak history, and readiness scores.' },
  ],

  systemStatus: {
    authentication: { name: 'Authentication & Auth0/Supabase', status: 'operational', label: 'Operational' },
    database: { name: 'Database & RLS Storage', status: 'maintenance', label: 'Under Maintenance' },
    aiProviders: { name: 'AI Model Inference Engine', status: 'operational', label: 'Operational' },
    storage: { name: 'PDF & Media Storage', status: 'operational', label: 'Operational' },
    apiGateway: { name: 'API Gateway & Rate Limiter', status: 'operational', label: 'Operational' },
  },

  deploymentSummary: [
    { time: '13:00 UTC', msg: 'Scheduled maintenance window initiated.', done: true },
    { time: '13:05 UTC', msg: 'Database schema migration executed on Supabase.', done: true },
    { time: '13:12 UTC', msg: 'Groq & Gemini failover router configured.', done: true },
    { time: '13:20 UTC', msg: 'Building static workspace bundles & edge node publishing.', active: true },
  ],
};

/**
 * Helper to fetch maintenance configuration.
 * Can easily be swapped to fetch from a live status API in production.
 */
export async function getMaintenanceData() {
  return MAINTENANCE_CONFIG;
}
