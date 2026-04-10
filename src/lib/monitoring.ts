import * as Sentry from '@sentry/react';
import LogRocket from 'logrocket';

/**
 * GPTE Monitoring Service
 * Integra Sentry para errores y LogRocket para reprodcción de sesiones.
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const LOGROCKET_ID = import.meta.env.VITE_LOGROCKET_ID;

export function initMonitoring() {
  // Inicialización de LogRocket
  if (LOGROCKET_ID) {
    LogRocket.init(LOGROCKET_ID);
    console.log('🚀 LogRocket inicializado');
  }

  // Inicialización de Sentry
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    console.log('🛡️ Sentry inicializado');
  }
}

/**
 * Identifica al usuario en ambos servicios para facilitar el debug.
 */
export function identifyUser(userId: string, userInfo: any = {}) {
  if (LOGROCKET_ID) {
    LogRocket.identify(userId, userInfo);
  }

  if (SENTRY_DSN) {
    Sentry.setUser({ id: userId, ...userInfo });
  }
}
