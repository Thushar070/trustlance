"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextProps {
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setNotifications((prev) => [...prev, { id, type, message, duration }]);
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const showSuccess = useCallback((message: string, duration?: number) => {
    showNotification("success", message, duration);
  }, [showNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    showNotification("error", message, duration);
  }, [showNotification]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showNotification("warning", message, duration);
  }, [showNotification]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showNotification("info", message, duration);
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        {notifications.map((n) => (
          <ToastCard key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

function ToastCard({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const { type, message } = notification;

  let bgColor = "";
  let borderColor = "";
  let textColor = "";
  let Icon = Info;

  switch (type) {
    case "success":
      bgColor = "bg-emerald-50 dark:bg-emerald-950/90";
      borderColor = "border-emerald-200 dark:border-emerald-900/50";
      textColor = "text-emerald-800 dark:text-emerald-300";
      Icon = CheckCircle2;
      break;
    case "error":
      bgColor = "bg-rose-50 dark:bg-rose-950/90";
      borderColor = "border-rose-200 dark:border-rose-900/50";
      textColor = "text-rose-800 dark:text-rose-300";
      Icon = XCircle;
      break;
    case "warning":
      bgColor = "bg-amber-50 dark:bg-amber-950/90";
      borderColor = "border-amber-200 dark:border-amber-900/50";
      textColor = "text-amber-800 dark:text-amber-300";
      Icon = AlertTriangle;
      break;
    case "info":
      bgColor = "bg-blue-50 dark:bg-blue-950/90";
      borderColor = "border-blue-200 dark:border-blue-900/50";
      textColor = "text-blue-800 dark:text-blue-300";
      Icon = Info;
      break;
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-toast-slide-in ${bgColor} ${borderColor} ${textColor}`}
      role="alert"
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{message}</div>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
