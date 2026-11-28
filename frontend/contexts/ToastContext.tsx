import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36);
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto remove after a few seconds
    setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  // Notices that used the browser's alert() appear as in-app toasts instead
  useEffect(() => {
    const original = window.alert;
    window.alert = (message?: unknown) => {
      const text = String(message ?? '').trim();
      const first = text.split(/\r?\n/)[0];
      showToast({ type: /fail|error|could not|unable|invalid|denied/i.test(text) ? 'error' : 'info', title: first.slice(0, 120), message: text.slice(first.length).trim() || undefined });
    };
    return () => {
      window.alert = original;
    };
  }, [showToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const toastConfig = {
    success: { icon: CheckCircle, tone: 'text-emerald-400' },
    error: { icon: XCircle, tone: 'text-rose-400' },
    warning: { icon: AlertTriangle, tone: 'text-amber-300' },
    info: { icon: Info, tone: 'text-sky-300' },
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      
      {/* Toasts — bottom centre, above the mobile bar, easy to reach and read */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[9999] flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;
          return (
            <div key={toast.id} className="pointer-events-auto flex w-full max-w-sm animate-rise-in items-center gap-3 rounded-2xl bg-maroon-900 px-4 py-3 text-white shadow-lift">
              <Icon size={19} className={config.tone} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{toast.title}</p>
                {toast.message && <p className="mt-0.5 text-xs leading-snug text-white/70">{toast.message}</p>}
              </div>
              <button onClick={() => removeToast(toast.id)} className="shrink-0 rounded-full p-1 text-white/60 transition hover:text-white" aria-label="Dismiss" style={{ minHeight: 0 }}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
