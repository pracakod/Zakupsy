"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", action?: { label: string; onClick: () => void }) => {
    const id = Math.random().toString(36).substring(2, 9);
    // Directly replace previous toasts to prevent stacking/spam
    setToasts([{ id, message, type, action }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, action ? 4000 : 2500); 
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[340px] flex flex-col gap-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slide-up flex items-center gap-3 p-3.5 rounded-2xl bg-surface-2/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl ring-1 ring-white/5"
          >
            <div className={`p-2 rounded-xl scale-110 ${
              toast.type === "success" ? "bg-green-500/10 text-green-400" :
              toast.type === "error" ? "bg-red-500/10 text-red-400" :
              "bg-brand-500/10 text-brand-400"
            }`}>
              {toast.type === "success" ? <CheckCircle2 size={16} /> :
               toast.type === "error" ? <AlertCircle size={16} /> :
               <Info size={16} />}
            </div>
            <div className="flex-1 overflow-hidden ml-1">
              <p className="text-[13px] font-bold leading-tight tracking-tight text-text-primary truncate">{toast.message}</p>
            </div>
            
            {toast.action && (
              <button 
                onClick={() => { toast.action?.onClick(); removeToast(toast.id); }}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.1em] hover:brightness-110 transition-all active:scale-90 shadow-lg shadow-brand-500/20"
              >
                {toast.action.label}
              </button>
            )}

            {!toast.action && (
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-muted opacity-30"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
