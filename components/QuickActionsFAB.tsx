import React, { useState } from 'react';
import { Plus, X, Pencil, Camera, Mic, ArrowRightLeft } from 'lucide-react';

interface QuickActionsFABProps {
    onManual: () => void;
    onScan: () => void;
    onVoice: () => void;
    onTransfer: () => void;
}

const actions = [
    { id: 'transfer', label: 'Transferir a Meta', icon: ArrowRightLeft, color: 'bg-blue-600 shadow-blue-500/30', delay: '0ms' },
    { id: 'voice', label: 'Nota de Voz', icon: Mic, color: 'bg-violet-600 shadow-violet-500/30', delay: '50ms' },
    { id: 'scan', label: 'Escanear Factura', icon: Camera, color: 'bg-amber-600 shadow-amber-500/30', delay: '100ms' },
    { id: 'manual', label: 'Ingreso Manual', icon: Pencil, color: 'bg-emerald-600 shadow-emerald-500/30', delay: '150ms' },
];

export const QuickActionsFAB: React.FC<QuickActionsFABProps> = ({ onManual, onScan, onVoice, onTransfer }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = (id: string) => {
        setIsOpen(false);
        switch (id) {
            case 'manual': onManual(); break;
            case 'scan': onScan(); break;
            case 'voice': onVoice(); break;
            case 'transfer': onTransfer(); break;
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Action items - float above FAB */}
            <div className="fixed bottom-24 right-6 lg:bottom-28 lg:right-10 z-50 flex flex-col-reverse gap-3 items-end">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <div
                            key={action.id}
                            className={`flex items-center gap-3 transition-all duration-300 ease-out ${isOpen
                                    ? 'opacity-100 translate-y-0 scale-100'
                                    : 'opacity-0 translate-y-4 scale-75 pointer-events-none'
                                }`}
                            style={{ transitionDelay: isOpen ? action.delay : '0ms' }}
                        >
                            {/* Label */}
                            <span className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 whitespace-nowrap">
                                {action.label}
                            </span>
                            {/* Icon button */}
                            <button
                                onClick={() => handleAction(action.id)}
                                className={`w-12 h-12 rounded-full ${action.color} shadow-lg text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}
                            >
                                <Icon size={20} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Main FAB button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 w-14 h-14 lg:w-16 lg:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isOpen
                        ? 'bg-slate-700 shadow-slate-500/20 rotate-45'
                        : 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/40 rotate-0'
                    }`}
                aria-label={isOpen ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas'}
            >
                {isOpen ? <X size={28} className="text-white" /> : <Plus size={32} className="text-white" />}
            </button>
        </>
    );
};
