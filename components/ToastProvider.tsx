'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error';
type ShowToast = (message: string, type?: ToastType) => void;

type ToastState = {
  message: string;
  type: ToastType;
  visible: boolean;
};

const ToastContext = createContext<ShowToast | null>(null);

const TOAST_ICONS: Record<ToastType, ReactNode> = {
  success: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: '', type: 'error', visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback<ShowToast>((message, type = 'error') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ message, type, visible: true });
    timerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className={`toast${state.visible ? ' show' : ''}`}
        role={state.type === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        data-type={state.type}
      >
        <span className="toast-icon" aria-hidden="true">
          {TOAST_ICONS[state.type]}
        </span>
        <span>{state.message}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
