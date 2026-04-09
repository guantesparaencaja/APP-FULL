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
    error: null
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
        userAgent: navigator.userAgent
      });
    } catch (e) {
      console.error('Failed to log error to Firestore', e);
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong.</h1>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-auto max-w-full text-sm text-red-400">
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <button
            className="mt-6 bg-primary text-black px-6 py-2 rounded-lg font-bold"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
