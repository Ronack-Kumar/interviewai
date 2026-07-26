/**
 * MockPrep Error Classification Engine
 * Differentiates API & runtime failures into 6 distinct, actionable categories.
 */

export const ERROR_TYPES = {
  BROWSER_OFFLINE: 'BROWSER_OFFLINE',
  AI_AUTH_FAILURE: 'AI_AUTH_FAILURE',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  GENERIC_ERROR: 'GENERIC_ERROR',
};

export function classifyError(error, status = null) {
  // 1. Browser Offline
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return {
      type: ERROR_TYPES.BROWSER_OFFLINE,
      title: 'Internet Connection Disconnected',
      explanation: 'Your browser is currently offline. Please check your Wi-Fi or cellular network connection.',
      icon: '📡',
      color: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.1)',
      badgeBorder: 'rgba(245, 158, 11, 0.25)',
      primaryAction: 'Reconnect & Retry',
      canRetry: true,
      canFailover: false,
    };
  }

  const errStr = (typeof error === 'string' ? error : error?.message || error?.toString() || '').toLowerCase();
  const statusCode = status || error?.status || error?.statusCode || null;

  // 2. AI Provider Auth Failure (401/403)
  if (statusCode === 401 || statusCode === 403 || errStr.includes('401') || errStr.includes('403') || errStr.includes('unauthorized') || errStr.includes('invalid api key') || errStr.includes('forbidden')) {
    return {
      type: ERROR_TYPES.AI_AUTH_FAILURE,
      title: 'AI Provider Authentication Failed (401/403)',
      explanation: 'The AI inference engine rejected the API key or authorization token. Please verify system keys.',
      icon: '🔑',
      color: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.1)',
      badgeBorder: 'rgba(244, 63, 94, 0.25)',
      primaryAction: 'Switch AI Model Failover',
      canRetry: true,
      canFailover: true,
    };
  }

  // 3. Usage Rate Limit Exceeded (429)
  if (statusCode === 429 || errStr.includes('429') || errStr.includes('rate limit') || errStr.includes('too many requests') || errStr.includes('daily cap')) {
    return {
      type: ERROR_TYPES.RATE_LIMIT_EXCEEDED,
      title: 'Daily Usage Rate Limit Reached (429)',
      explanation: 'You have reached your daily AI query limit (20 authenticated / 5 guest rounds). Caps reset at 00:00 UTC.',
      icon: '🛑',
      color: '#eab308',
      badgeBg: 'rgba(234, 179, 8, 0.1)',
      badgeBorder: 'rgba(234, 179, 8, 0.25)',
      primaryAction: 'Retry Request',
      canRetry: true,
      canFailover: false,
    };
  }

  // 4. Network Timeout
  if (statusCode === 408 || errStr.includes('timeout') || errStr.includes('timed out') || errStr.includes('etimedout') || errStr.includes('aborterror')) {
    return {
      type: ERROR_TYPES.NETWORK_TIMEOUT,
      title: 'Network Gateway Request Timeout',
      explanation: 'The request exceeded the sub-800ms latency threshold before receiving a response from the inference worker.',
      icon: '⏱️',
      color: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.1)',
      badgeBorder: 'rgba(245, 158, 11, 0.25)',
      primaryAction: 'Retry Request',
      canRetry: true,
      canFailover: true,
    };
  }

  // 5. Backend / Supabase Unavailable
  if (errStr.includes('pgrst') || errStr.includes('supabase') || errStr.includes('database') || errStr.includes('postgrest') || errStr.includes('table') || errStr.includes('relation')) {
    return {
      type: ERROR_TYPES.DATABASE_UNAVAILABLE,
      title: 'Database & Storage Unreachable',
      explanation: 'Unable to connect to the Supabase persistence layer. Operating in fail-open mode without saving history.',
      icon: '🗄️',
      color: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.1)',
      badgeBorder: 'rgba(244, 63, 94, 0.25)',
      primaryAction: 'Retry Database Sync',
      canRetry: true,
      canFailover: false,
    };
  }

  // 6. AI Provider Unavailable (5xx)
  if ((statusCode >= 500 && statusCode < 600) || errStr.includes('500') || errStr.includes('502') || errStr.includes('503') || errStr.includes('504') || errStr.includes('service unavailable') || errStr.includes('internal server error')) {
    return {
      type: ERROR_TYPES.AI_PROVIDER_UNAVAILABLE,
      title: 'AI Model Service Unavailable (5xx)',
      explanation: 'The primary Groq/Gemini inference worker encountered a server outage. Model failover route is ready.',
      icon: '🤖',
      color: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.1)',
      badgeBorder: 'rgba(244, 63, 94, 0.25)',
      primaryAction: 'Trigger Model Failover',
      canRetry: true,
      canFailover: true,
    };
  }

  // Generic Fallback
  return {
    type: ERROR_TYPES.GENERIC_ERROR,
    title: 'Application Service Disruption',
    explanation: error?.message || 'An unexpected issue occurred while processing your request.',
    icon: '⚡',
    color: '#f43f5e',
    badgeBg: 'rgba(244, 63, 94, 0.1)',
    badgeBorder: 'rgba(244, 63, 94, 0.25)',
    primaryAction: 'Retry Request',
    canRetry: true,
    canFailover: false,
  };
}
