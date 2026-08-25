import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initMonitoring } from './lib/monitoring';
import { initAnalytics } from './lib/analytics';

// Inicializar Monitoreo (Sentry + LogRocket)
initMonitoring();

// Inicializar Analytics opcional (solo si hay VITE_GA_MEASUREMENT_ID)
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
