import React from 'react';
import { Download, ArrowRightLeft, Trash2, Search, Camera, Mic } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatMoney } from '../utils/format';

interface TransactionsViewProps {
    filteredTransactions: Transaction[];
    categories: Category[];
    onEditTransaction: (t: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
    onExportCSV: () => void;
    onOpenTransferModal: () => void;
}

// --- Helpers for date grouping ---
const getDateGroupLabel = (dateStr: string): string => {
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().substring(0, 10);

    const cleanDate = dateStr.substring(0, 10);

    if (cleanDate === todayStr) return 'Hoy';
    if (cleanDate === yesterdayStr) return 'Ayer';

    // Check if same week
    const txDate = new Date(cleanDate + 'T12:00:00');
    const diffDays = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays >= 0) return 'Esta Semana';

    // Format as "Enero 2026"
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [y, m] = cleanDate.split('-').map(Number);
    return `${months[m - 1]} ${y}`;
};

const groupTransactionsByDate = (transactions: Transaction[]): { label: string; items: Transaction[] }[] => {
    const groups: Map<string, Transaction[]> = new Map();

    for (const t of transactions) {
        const label = getDateGroupLabel(t.date);
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)!.push(t);
    }

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
};

// --- Method badge component ---
const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
    if (method === 'ocr') return (
        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-medium border border-amber-500/20">
            <Camera size={10} /> OCR
        </span>
    );
    if (method === 'voice') return (
        <span className="inline-flex items-center gap-1 bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-md text-[10px] font-medium border border-violet-500/20">
            <Mic size={10} /> Voz
        </span>
    );
    return null;
};


export const TransactionsView: React.FC<TransactionsViewProps> = ({
    filteredTransactions,
    categories,
    onEditTransaction,
    onDeleteTransaction,
    onExportCSV,
    onOpenTransferModal
}) => {
    const groups = groupTransactionsByDate(filteredTransactions);

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-white">Historial</h3>
                    <p className="text-xs text-slate-500">{filteredTransactions.length} movimientos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onExportCSV}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors"
                        title="Descargar CSV con los filtros actuales"
                    >
                        <Download size={14} /> CSV
                    </button>
                    <button
                        onClick={onOpenTransferModal}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors"
                    >
                        <ArrowRightLeft size={14} /> A Metas
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {filteredTransactions.length === 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        <Search size={28} className="text-slate-500" />
                    </div>
                    <p className="text-base font-bold text-slate-300">No se encontraron movimientos</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                        Intenta ajustar los filtros o usa el botón <span className="text-emerald-400">+</span> para agregar uno.
                    </p>
                </div>
            )}

            {/* Grouped Transactions */}
            {groups.map((group) => (
                <div key={group.label}>
                    {/* Date Group Header */}
                    <div className="flex items-center gap-3 mb-2 mt-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {group.label}
                        </h4>
                        <div className="flex-1 h-px bg-slate-800"></div>
                        <span className="text-[10px] text-slate-600 font-medium">{group.items.length}</span>
                    </div>

                    {/* Transaction Cards */}
                    <div className="space-y-1.5">
                        {group.items.map((t) => {
                            // Category icon lookup
                            const categoryObj = categories.find(c => c.name === t.category);
                            const IconComponent = categoryObj
                                ? (LucideIcons as any)[categoryObj.icon]
                                : (t.category === 'Ahorro' ? LucideIcons.PiggyBank : LucideIcons.HelpCircle);
                            const FinalIcon = IconComponent || LucideIcons.Circle;

                            // Date format
                            const cleanDate = typeof t.date === 'string'
                                ? t.date.substring(0, 10)
                                : new Date(t.date).toISOString().substring(0, 10);
                            const [, monthStr, dayStr] = cleanDate.split('-');
                            const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
                            const monthIndex = parseInt(monthStr) - 1;

                            // Icon color based on type
                            const iconBg = t.category === 'Ahorro'
                                ? 'bg-blue-500/15 text-blue-400'
                                : t.type === 'income'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-red-500/10 text-red-400';

                            return (
                                <div
                                    key={t.id}
                                    onClick={() => onEditTransaction(t)}
                                    className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-700 rounded-xl p-3 cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Category Icon */}
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                                            <FinalIcon size={20} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-200 truncate">
                                                    {t.category}
                                                </span>
                                                <MethodBadge method={t.method} />
                                            </div>
                                            <span className="text-xs text-slate-500 truncate block">
                                                {t.description || 'Sin notas'} • {dayStr} {monthNames[monthIndex]} • {t.paymentMethod === 'cash' ? 'Efectivo' : 'Banco'}
                                            </span>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right flex-shrink-0">
                                            <span className={`block font-bold text-base ${t.category === 'Ahorro' ? 'text-blue-400' :
                                                    t.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                                            </span>
                                        </div>

                                        {/* Delete button (desktop) */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }}
                                            className="hidden md:flex text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
