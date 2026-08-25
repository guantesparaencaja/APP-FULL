/**
 * analytics.ts — Google Analytics 4 OPcional (solo se activa si existe VITE_GA_MEASUREMENT_ID).
 * No bloquea la carga: el script de gtag se inyecta async tras el primer render.
 */

const MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string) || '';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const isAnalyticsEnabled = (): boolean => Boolean(MEASUREMENT_ID);

export function initAnalytics(): void {
  if (!MEASUREMENT_ID || document.getElementById('ga-gtag')) return;
  const script = document.createElement('script');
  script.id = 'ga-gtag';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    (window.dataLayer as unknown[]).push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID);
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!MEASUREMENT_ID) return;
  if (!window.gtag) initAnalytics();
  window.gtag?.('event', name, params || {});
}