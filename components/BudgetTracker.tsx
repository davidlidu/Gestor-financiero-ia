import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { formatMoney } from '../utils/format';
import { Transaction, Category, Budget } from '../types';
import { Plus, Edit2, Trash2, PiggyBank, AlertCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface BudgetTrackerProps {
    transactions: Transaction[];
    categories: Category[];
}

// Helper to get current YYYY-MM
const getCurrentMonthYear = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({ transactions, categories }) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [currentMonth, setCurrentMonth] = useState(getCurrentMonthYear());
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [budgetAmount, setBudgetAmount] = useState<number | ''>('');

    const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

    useEffect(() => {
        const fetchBudgets = async () => {
            const data = await StorageService.getBudgets(currentMonth);
            setBudgets(data);
        };
        fetchBudgets();
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

        const cat = expenseCategories.find(c => c.id === selectedCategory);
        if (!cat) return;

        const newBudget: Budget = {
            id: '',
            categoryId: cat.id,
            categoryName: cat.name,
            amount: Number(budgetAmount),
            monthYear: currentMonth
        };

        const updated = await StorageService.saveBudget(newBudget);
        setBudgets(updated);

        // Reset form
        setIsAdding(false);
        setSelectedCategory('');
        setBudgetAmount('');
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <PiggyBank className="text-brand-500" /> Presupuestos ({currentMonth})
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Controla tus gastos por categoría este mes.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} /> Nuevo Presupuesto
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Categoría</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white"
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
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveBudget}
                            disabled={!selectedCategory || !budgetAmount}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            {budgetStats.length === 0 && !isAdding ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <PiggyBank size={32} />
                    </div>
                    <p className="text-slate-500">No tienes presupuestos configurados para este mes.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {budgetStats.map((stat) => {
                        const catIconInfo = expenseCategories.find(c => c.id === stat.categoryId)?.icon;
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
                                    <div className="text-right">
                                        <p className={`font-bold text-lg ${stat.textColor}`}>
                                            {stat.progress.toFixed(0)}%
                                        </p>
                                        {stat.progress >= 100 && (
                                            <p className="text-[10px] text-danger-500 flex items-center gap-1">
                                                <AlertCircle size={10} /> Presupuesto excedido
                                            </p>
                                        )}
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
