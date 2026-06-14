"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// צבעי Toast לפי סעיף 17: הצלחה רקע #ECFDF5/טקסט #166534, שגיאה רקע #FEF2F2/טקסט #EF4444
const KIND_STYLES: Record<ToastKind, string> = {
  success: "text-[#166534]",
  error: "text-error",
  info: "text-navy",
};
const KIND_BG: Record<ToastKind, string> = {
  success: "#ECFDF5",
  error: "#FEF2F2",
  info: "#ffffff",
};

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextToastId++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`page-fade-in pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-[0_8px_24px_rgba(15,23,42,0.12)] ${KIND_STYLES[t.kind]}`}
            style={{ backgroundColor: KIND_BG[t.kind] }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
