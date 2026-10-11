import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { formatMoney } from '../utils/format';
import { Transaction, Category, Budget } from '../types';
import { Plus, Edit2, Trash2, PiggyBank, AlertCircle, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { BudgetInsights } from './BudgetInsights';

interface BudgetTrackerProps {
    transactions: Transaction[];
    categories: Category[];
}

// Helper to get current YYYY-MM
const getCurrentMonthYear = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// 'YYYY-MM' desplazado n meses
const shiftMonth = (month: string, delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
};

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({ transactions, categories }) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [currentMonth, setCurrentMonth] = useState(getCurrentMonthYear());
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [budgetAmount, setBudgetAmount] = useState<number | ''>('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

    // Copiar presupuestos de otro mes
    const [isCopying, setIsCopying] = useState(false);
    const [copySource, setCopySource] = useState('');
    const [copying, setCopying] = useState(false);
    const [copyMessage, setCopyMessage] = useState('');

    const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

    useEffect(() => {
        let cancelled = false;
        const fetchBudgets = async () => {
            const data = await StorageService.getBudgets(currentMonth);
            if (!cancelled) setBudgets(data);
        };
        fetchBudgets();
        // Al cambiar de mes se cierran los formularios y se limpian los avisos
        setIsAdding(false);
        setIsCopying(false);
        setEditingCategoryId(null);
        setSelectedCategory('');
        setBudgetAmount('');
        setSaveError('');
        setCopyMessage('');
        setCopySource(shiftMonth(currentMonth, -1));
        return () => { cancelled = true; };
    }, [currentMonth]);

    // Calculate spent per budget
    const budgetStats = useMemo(() => {
        return budgets.map(budget => {
            // Filter transactions for this month and category
            const spent = transactions
                .filter(t => t.type === 'expense' && t.category === budget.categoryName && t.date.startsWith(currentMonth))
                .reduce((acc, t) => acc + t.amount, 0);

            const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const cappedProgress = Math.min(progress, 100);

            // Define colors based on progress
            let color = 'bg-brand-500';
            let textColor = 'text-brand-500';
            if (progress >= 100) {
                color = 'bg-danger-500';
                textColor = 'text-danger-500';
            } else if (progress >= 80) {
                color = 'bg-orange-500';
                textColor = 'text-orange-500';
            } else if (progress >= 50) {
                color = 'bg-yellow-500';
                textColor = 'text-yellow-500';
            }

            return {
                ...budget,
                spent,
                progress,
                cappedProgress,
                color,
                textColor
            };
        }).sort((a, b) => b.progress - a.progress); // Sort by highest usage
    }, [budgets, transactions, currentMonth]);

    const handleSaveBudget = async () => {
        if (!selectedCategory || !budgetAmount) return;

        // La API devuelve el id de la categoría como número y el <select> entrega texto: se compara como texto.
        const cat = expenseCategories.find(c => String(c.id) === selectedCategory);
        if (!cat) {
            setSaveError('No se encontró la categoría seleccionada. Vuelve a elegirla.');
            return;
        }

        const newBudget: Budget = {
            id: '',
            categoryId: String(cat.id),
            categoryName: cat.name,
            amount: Number(budgetAmount),
            monthYear: currentMonth
        };

        setSaving(true);
        setSaveError('');
        try {
            const updated = await StorageService.saveBudget(newBudget);
            setBudgets(updated);

            // Reset form
            setIsAdding(false);
            setEditingCategoryId(null);
            setSelectedCategory('');
            setBudgetAmount('');
        } catch (e: any) {
            setSaveError(e?.message || 'No se pudo guardar el presupuesto. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (b: Budget) => {
        setIsCopying(false);
        setSaveError('');
        setEditingCategoryId(String(b.categoryId));
        setSelectedCategory(String(b.categoryId));
        setBudgetAmount(b.amount);
        setIsAdding(true);
    };

    const cancelForm = () => {
        setIsAdding(false);
        setEditingCategoryId(null);
        setSelectedCategory('');
        setBudgetAmount('');
        setSaveError('');
    };

    const handleDelete = async (b: Budget) => {
        if (!confirm(`¿Eliminar el presupuesto de ${b.categoryName} en ${monthLabel(currentMonth)}?`)) return;
        setSaveError('');
        try {
            setBudgets(await StorageService.deleteBudget(b.id, currentMonth));
        } catch (e: any) {
            setSaveError(e?.message || 'No se pudo eliminar el presupuesto.');
        }
    };

    const handleCopy = async (from: string) => {
        setCopying(true);
        setSaveError('');
        setCopyMessage('');
        try {
            const { copied, skipped } = await StorageService.copyBudgets(from, currentMonth);
            setBudgets(await StorageService.getBudgets(currentMonth));
            setIsCopying(false);
            setCopyMessage(
                copied === 0 && skipped === 0
                    ? `${monthLabel(from)} no tiene presupuestos para copiar.`
                    : `Se copiaron ${copied} presupuesto${copied === 1 ? '' : 's'} de ${monthLabel(from)}` +
                      (skipped === 0 ? '.' : skipped === 1 ? ' (1 ya existía y no se tocó).' : ` (${skipped} ya existían y no se tocaron).`)
            );
        } catch (e: any) {
            setSaveError(e?.message || 'No se pudieron copiar los presupuestos.');
        } finally {
            setCopying(false);
        }
    };

    // Últimos 12 meses (sin el actual) para elegir de dónde copiar
    const sourceMonths = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonth, -(i + 1)));
    const prevMonth = shiftMonth(currentMonth, -1);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-hidden relative">
            <div className="flex justify-between items-start gap-3 flex-wrap mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <PiggyBank className="text-brand-500" /> Presupuestos
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Controla tus gastos por categoría en el mes.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white" aria-label="Mes anterior">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[130px] text-center">{monthLabel(currentMonth)}</span>
                        <button onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white" aria-label="Mes siguiente">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    {!isAdding && (
                        <>
                            <button
                                onClick={() => { setIsCopying(!isCopying); setCopyMessage(''); }}
                                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                            >
                                <Copy size={16} /> Copiar de otro mes
                            </button>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Plus size={18} /> Nuevo Presupuesto
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isCopying && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 sm:items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Copiar presupuestos de</label>
                        <select
                            value={copySource}
                            onChange={(e) => setCopySource(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white"
                        >
                            {sourceMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">A {monthLabel(currentMonth)}. Los que ya existan en este mes no se modifican; luego puedes ajustar los que cambian, como el mercado.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsCopying(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={() => handleCopy(copySource)}
                            disabled={!copySource || copying}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {copying ? 'Copiando...' : 'Copiar aquí'}
                        </button>
                    </div>
                </div>
            )}

            {copyMessage && (
                <p className="mb-4 text-sm text-brand-600 dark:text-brand-400">{copyMessage}</p>
            )}

            {isAdding && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Categoría</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            disabled={editingCategoryId !== null}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white disabled:opacity-60"
                        >
                            <option value="">Seleccionar...</option>
                            {expenseCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Límite Mensual ($)</label>
                        <input
                            type="number"
                            placeholder="Ej: 500000"
                            value={budgetAmount}
                            onChange={(e) => setBudgetAmount(e.target.value ? Number(e.target.value) : '')}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={cancelForm}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveBudget}
                            disabled={!selectedCategory || !budgetAmount || saving}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}

            {saveError && (
                <p className="mb-4 text-sm text-danger-500 flex items-center gap-1.5"><AlertCircle size={14} /> {saveError}</p>
            )}

            {budgetStats.length > 0 && (
                <BudgetInsights month={currentMonth} transactions={transactions} stats={budgetStats} />
            )}

            {budgetStats.length === 0 && !isAdding ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <PiggyBank size={32} />
                    </div>
                    <p className="text-slate-500">No tienes presupuestos configurados para {monthLabel(currentMonth)}.</p>
                    <button
                        onClick={() => handleCopy(prevMonth)}
                        disabled={copying}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                    >
                        <Copy size={15} /> {copying ? 'Copiando...' : `Copiar los de ${monthLabel(prevMonth)}`}
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {budgetStats.map((stat) => {
                        const catIconInfo = expenseCategories.find(c => String(c.id) === String(stat.categoryId))?.icon;
                        const catIcon = catIconInfo && (LucideIcons as any)[catIconInfo]
                            ? (LucideIcons as any)[catIconInfo]
                            : LucideIcons.AlertCircle;

                        return (
                            <div key={stat.id} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                                            {React.createElement(catIcon, { size: 16 })}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-white">{stat.categoryName}</p>
                                            <p className="text-xs text-slate-500">
                                                ${formatMoney(stat.spent)} de ${formatMoney(stat.amount)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className={`font-bold text-lg ${stat.textColor}`}>
                                                {stat.progress.toFixed(0)}%
                                            </p>
                                            {stat.progress > 100 && (
                                                <p className="text-[10px] text-danger-500 flex items-center gap-1">
                                                    <AlertCircle size={10} /> Presupuesto excedido
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center">
                                            <button onClick={() => startEdit(stat)} className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg" title="Editar monto" aria-label={`Editar presupuesto de ${stat.categoryName}`}>
                                                <Edit2 size={15} />
                                            </button>
                                            <button onClick={() => handleDelete(stat)} className="p-1.5 text-slate-400 hover:text-danger-500 rounded-lg" title="Eliminar" aria-label={`Eliminar presupuesto de ${stat.categoryName}`}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${stat.color} transition-all duration-1000 ease-out`}
                                        style={{ width: `${stat.cappedProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
