import React, { Component, ErrorInfo, ReactNode } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Log error to Firestore
    try {
      addDoc(collection(db, 'system_errors'), {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    } catch (e) {
      console.error('Failed to log error to Firestore', e);
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center gap-4 min-h-[40vh]">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">
            🥊
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            Sección No Disponible
          </h2>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
            Hubo un error cargando este módulo. Por favor intenta de nuevo. Si el problema persiste, contacta al administrador.
          </p>
          <button
            className="mt-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95"
            onClick={() => window.location.reload()}
          >
            🔄 Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
