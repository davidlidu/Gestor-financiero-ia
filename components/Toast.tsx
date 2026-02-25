import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastItemProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const ICONS = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const STYLES = {
    success: {
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        icon: 'text-emerald-400',
        bar: 'bg-emerald-500',
    },
    error: {
        bg: 'bg-red-500/10 border-red-500/30',
        icon: 'text-red-400',
        bar: 'bg-red-500',
    },
    warning: {
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: 'text-amber-400',
        bar: 'bg-amber-500',
    },
    info: {
        bg: 'bg-blue-500/10 border-blue-500/30',
        icon: 'text-blue-400',
        bar: 'bg-blue-500',
    },
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
    const [isLeaving, setIsLeaving] = useState(false);
    const [progress, setProgress] = useState(100);
    const duration = toast.duration || 4000;

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                setIsLeaving(true);
                setTimeout(() => onDismiss(toast.id), 300);
            }
        }, 30);
        return () => clearInterval(interval);
    }, [toast.id, duration, onDismiss]);

    const Icon = ICONS[toast.type];
    const style = STYLES[toast.type];

    return (
        <div
            className={`relative overflow-hidden rounded-xl border backdrop-blur-lg shadow-2xl shadow-black/20 transition-all duration-300 ${style.bg} ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
                }`}
            style={{ animation: isLeaving ? undefined : 'slideInRight 0.3s ease-out' }}
        >
            <div className="flex items-start gap-3 p-4 pr-10">
                <Icon size={20} className={`${style.icon} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{toast.title}</p>
                    {toast.message && (
                        <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsLeaving(true);
                        setTimeout(() => onDismiss(toast.id), 300);
                    }}
                    className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
            {/* Progress bar */}
            <div className="h-0.5 w-full bg-slate-800/50">
                <div
                    className={`h-full ${style.bar} transition-all duration-100 ease-linear`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

// --- Toast Container (renders at top-right) ---
interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

// --- Hook for managing toasts ---
export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (title: string, message?: string) => addToast('success', title, message),
        error: (title: string, message?: string) => addToast('error', title, message),
        warning: (title: string, message?: string) => addToast('warning', title, message),
        info: (title: string, message?: string) => addToast('info', title, message),
    };

    return { toasts, toast, dismissToast };
}
