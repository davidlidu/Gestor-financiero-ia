import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, ArrowRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatMoney } from '../utils/format';

interface ReportsViewProps {
    transactions: Transaction[];
    categories: Category[];
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, categories }) => {
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

    // Navigate months
    const goToPrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };
    const goToNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const reportData = useMemo(() => {
        // Current month
        const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        const monthEndStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

        const currentTx = transactions.filter(t => t.date >= monthStart && t.date <= monthEndStr);

        // Previous month
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        const prevStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
        const prevEnd = new Date(prevYear, prevMonth + 1, 0);
        const prevEndStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevEnd.getDate()).padStart(2, '0')}`;
        const prevTx = transactions.filter(t => t.date >= prevStart && t.date <= prevEndStr);

        // Totals
        const income = currentTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const expense = currentTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
        const prevIncome = prevTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const prevExpense = prevTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
        const netFlow = income - expense;
        const prevNetFlow = prevIncome - prevExpense;

        // Trends
        const incomeTrend = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : (income > 0 ? 100 : 0);
        const expenseTrend = prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : (expense > 0 ? 100 : 0);

        // Top categories (expense)
        const expByCat: Record<string, number> = {};
        currentTx.filter(t => t.type === 'expense').forEach(t => {
            expByCat[t.category] = (expByCat[t.category] || 0) + t.amount;
        });
        const topExpenseCategories = Object.entries(expByCat)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, amount]) => ({ name, amount, percent: expense > 0 ? Math.round((amount / expense) * 100) : 0 }));

        // Top categories (income)
        const incByCat: Record<string, number> = {};
        currentTx.filter(t => t.type === 'income').forEach(t => {
            incByCat[t.category] = (incByCat[t.category] || 0) + t.amount;
        });
        const topIncomeCategories = Object.entries(incByCat)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, amount]) => ({ name, amount, percent: income > 0 ? Math.round((amount / income) * 100) : 0 }));

        // Daily spending pattern (for bar visualization)
        const dailySpend: Record<string, number> = {};
        currentTx.filter(t => t.type === 'expense').forEach(t => {
            const day = t.date.substring(8, 10);
            dailySpend[day] = (dailySpend[day] || 0) + t.amount;
        });
        const maxDailySpend = Math.max(...Object.values(dailySpend), 1);

        // Monthly overview for the year (6 months back)
        const monthlyOverview: { month: string; income: number; expense: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const mOffset = selectedMonth - i;
            const mMonth = ((mOffset % 12) + 12) % 12;
            const mYear = selectedYear + Math.floor(mOffset / 12) - (mOffset < 0 ? 1 : 0);
            const mYearActual = mOffset < 0 ? mYear + 1 : mYear;

            const ms = `${mYearActual}-${String(mMonth + 1).padStart(2, '0')}-01`;
            const me = new Date(mYearActual, mMonth + 1, 0);
            const meStr = `${mYearActual}-${String(mMonth + 1).padStart(2, '0')}-${String(me.getDate()).padStart(2, '0')}`;

            const mTx = transactions.filter(t => t.date >= ms && t.date <= meStr);
            monthlyOverview.push({
                month: SHORT_MONTHS[mMonth],
                income: mTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
                expense: mTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
            });
        }

        // Transaction count by method
        const manualCount = currentTx.filter(t => t.method === 'manual').length;
        const ocrCount = currentTx.filter(t => t.method === 'ocr').length;
        const voiceCount = currentTx.filter(t => t.method === 'voice').length;

        return {
            income, expense, netFlow, prevIncome, prevExpense, prevNetFlow,
            incomeTrend, expenseTrend,
            topExpenseCategories, topIncomeCategories,
            dailySpend, maxDailySpend,
            monthlyOverview,
            txCount: currentTx.length,
            manualCount, ocrCount, voiceCount,
        };
    }, [transactions, selectedMonth, selectedYear]);

    const maxMonthlyVal = Math.max(
        ...reportData.monthlyOverview.flatMap(m => [m.income, m.expense]),
        1
    );

    return (
        <div className="space-y-6">
            {/* Month Selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 size={22} className="text-emerald-400" /> Reportes
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Análisis detallado de tus finanzas</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 rounded-xl border border-slate-700 px-1 py-1">
                    <button onClick={goToPrevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <div className="px-3 py-1.5 text-center min-w-[130px]">
                        <p className="text-sm font-bold text-white">{MONTHS[selectedMonth]}</p>
                        <p className="text-[10px] text-slate-500">{selectedYear}</p>
                    </div>
                    <button onClick={goToNextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
                    <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Ingresos</p>
                    <p className="text-lg font-bold text-emerald-400">${formatMoney(reportData.income)}</p>
                    {reportData.incomeTrend !== 0 && (
                        <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${reportData.incomeTrend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {reportData.incomeTrend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {reportData.incomeTrend >= 0 ? '+' : ''}{reportData.incomeTrend}%
                        </div>
                    )}
                </div>
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
                    <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Egresos</p>
                    <p className="text-lg font-bold text-red-400">${formatMoney(reportData.expense)}</p>
                    {reportData.expenseTrend !== 0 && (
                        <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${reportData.expenseTrend <= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {reportData.expenseTrend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {reportData.expenseTrend > 0 ? '+' : ''}{reportData.expenseTrend}%
                        </div>
                    )}
                </div>
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
                    <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Flujo Neto</p>
                    <p className={`text-lg font-bold ${reportData.netFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {reportData.netFlow >= 0 ? '+' : ''}${formatMoney(reportData.netFlow)}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">{reportData.txCount} movimientos</p>
                </div>
            </div>

            {/* 6-Month Overview Bar Chart */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Últimos 6 Meses</h3>
                <div className="flex items-end gap-2 h-32">
                    {reportData.monthlyOverview.map((m, idx) => {
                        const incHeight = maxMonthlyVal > 0 ? (m.income / maxMonthlyVal) * 100 : 0;
                        const expHeight = maxMonthlyVal > 0 ? (m.expense / maxMonthlyVal) * 100 : 0;
                        const isCurrentMonth = idx === reportData.monthlyOverview.length - 1;

                        return (
                            <div key={m.month + idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="flex gap-0.5 items-end h-24 w-full justify-center">
                                    <div
                                        className={`w-3 rounded-t transition-all duration-500 ${isCurrentMonth ? 'bg-emerald-500' : 'bg-emerald-500/40'}`}
                                        style={{ height: `${Math.max(incHeight, 2)}%` }}
                                        title={`Ingresos: $${formatMoney(m.income)}`}
                                    />
                                    <div
                                        className={`w-3 rounded-t transition-all duration-500 ${isCurrentMonth ? 'bg-red-500' : 'bg-red-500/40'}`}
                                        style={{ height: `${Math.max(expHeight, 2)}%` }}
                                        title={`Gastos: $${formatMoney(m.expense)}`}
                                    />
                                </div>
                                <span className={`text-[10px] font-medium ${isCurrentMonth ? 'text-white' : 'text-slate-500'}`}>
                                    {m.month}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500"></span> Ingresos</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500"></span> Egresos</span>
                </div>
            </div>

            {/* Top Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Expense Categories */}
                <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
                    <h3 className="text-sm font-bold text-slate-300 mb-4">
                        Top Gastos — {MONTHS[selectedMonth]}
                    </h3>
                    {reportData.topExpenseCategories.length === 0 && (
                        <p className="text-sm text-slate-600 py-4 text-center">Sin gastos este mes</p>
                    )}
                    <div className="space-y-3">
                        {reportData.topExpenseCategories.map((cat, idx) => {
                            const catObj = categories.find(c => c.name === cat.name);
                            const CatIcon = catObj ? (LucideIcons as any)[catObj.icon] || LucideIcons.Circle : LucideIcons.Circle;

                            return (
                                <div key={cat.name} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0">
                                        <CatIcon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-slate-300 truncate">{cat.name}</span>
                                            <span className="text-xs font-bold text-red-400 flex-shrink-0">${formatMoney(cat.amount)}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-500/60 rounded-full transition-all duration-700"
                                                style={{ width: `${cat.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium w-8 text-right">{cat.percent}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Income Categories */}
                <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
                    <h3 className="text-sm font-bold text-slate-300 mb-4">
                        Top Ingresos — {MONTHS[selectedMonth]}
                    </h3>
                    {reportData.topIncomeCategories.length === 0 && (
                        <p className="text-sm text-slate-600 py-4 text-center">Sin ingresos este mes</p>
                    )}
                    <div className="space-y-3">
                        {reportData.topIncomeCategories.map((cat, idx) => {
                            const catObj = categories.find(c => c.name === cat.name);
                            const CatIcon = catObj ? (LucideIcons as any)[catObj.icon] || LucideIcons.Circle : LucideIcons.Circle;

                            return (
                                <div key={cat.name} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                        <CatIcon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-slate-300 truncate">{cat.name}</span>
                                            <span className="text-xs font-bold text-emerald-400 flex-shrink-0">${formatMoney(cat.amount)}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500/60 rounded-full transition-all duration-700"
                                                style={{ width: `${cat.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium w-8 text-right">{cat.percent}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* AI Input Methods Stats */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-3">Métodos de Registro</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700/30">
                        <p className="text-2xl font-bold text-slate-200">{reportData.manualCount}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">✏️ Manual</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-amber-500/20">
                        <p className="text-2xl font-bold text-amber-400">{reportData.ocrCount}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">📷 OCR (IA)</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-violet-500/20">
                        <p className="text-2xl font-bold text-violet-400">{reportData.voiceCount}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">🎙️ Voz (IA)</p>
                    </div>
                </div>
            </div>

            {/* Comparison with Last Month */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/60 rounded-xl border border-slate-700/50 p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-400" />
                    Comparativa: {MONTHS[selectedMonth]} vs {MONTHS[selectedMonth === 0 ? 11 : selectedMonth - 1]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Ingresos</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-emerald-400">${formatMoney(reportData.income)}</span>
                            <span className="text-[10px] text-slate-600">vs ${formatMoney(reportData.prevIncome)}</span>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${reportData.incomeTrend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {reportData.incomeTrend >= 0 ? '↑' : '↓'} {Math.abs(reportData.incomeTrend)}%
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Egresos</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-red-400">${formatMoney(reportData.expense)}</span>
                            <span className="text-[10px] text-slate-600">vs ${formatMoney(reportData.prevExpense)}</span>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${reportData.expenseTrend <= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {reportData.expenseTrend > 0 ? '↑' : '↓'} {Math.abs(reportData.expenseTrend)}%
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Flujo Neto</p>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-base font-bold ${reportData.netFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {reportData.netFlow >= 0 ? '+' : ''}${formatMoney(reportData.netFlow)}
                            </span>
                            <span className="text-[10px] text-slate-600">
                                vs {reportData.prevNetFlow >= 0 ? '+' : ''}${formatMoney(reportData.prevNetFlow)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
