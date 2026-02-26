import React, { useEffect, useState, useMemo } from 'react';
import { Settings, Plus, LayoutDashboard, Wallet, PieChart, Menu, LogOut, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, Pencil, Filter, X, Lock, Mail, User as UserIcon, ShieldCheck, PiggyBank, ArrowRightLeft, Link as LinkIcon, Save, Camera, UploadCloud, Download, CalendarDays } from 'lucide-react';
import { Transaction, UserProfile, SavingsGoal, AuthState, Category } from './types';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { BalanceAreaChart, CategoryPieChart, ComparisonBarChart } from './components/Charts';
import { TransactionModal } from './components/TransactionModal';
import { SavingsModal } from './components/SavingsModal';
import { TransferModal } from './components/TransferModal';
import { Layout } from './components/Layout';
import { BudgetTracker } from './components/BudgetTracker';
import { Auth } from './components/Auth';
import { TransactionsView } from './components/TransactionsView';
import { SettingsView } from './components/SettingsView';
import { ReportsView } from './components/ReportsView';
import { InstallmentsView } from './components/InstallmentsView';
import { INITIAL_SAVINGS } from './constants';
import { AVAILABLE_ICONS } from './components/IconSelector';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronUp, History, Search } from 'lucide-react';
import { ToastContainer, useToast } from './components/Toast';
import { QuickActionsFAB } from './components/QuickActionsFAB';

// Componente para seleccionar iconos
const IconSelector = ({ selected, onSelect }: { selected: string, onSelect: (i: string) => void }) => {
    return (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mt-2 p-2 bg-slate-900 rounded-lg border border-slate-700 max-h-48 overflow-y-auto custom-scrollbar">
            {AVAILABLE_ICONS.map(iconName => {
                const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
                return (
                    <button
                        key={iconName}
                        onClick={() => onSelect(iconName)}
                        title={iconName}
                        className={`p-2 rounded-lg flex justify-center items-center transition-all ${selected === iconName ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                        <Icon size={20} />
                    </button>
                )
            })}
        </div>
    );
};

import { formatMoney } from './utils/format';

function App() {
    // --- Auth State ---
    const [user, setUser] = useState<UserProfile | null>(null);
    const [authView, setAuthView] = useState<AuthState>({ view: 'login', email: '' });
    const [authLoading, setAuthLoading] = useState(true);

    // Auth Form State
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // --- App Data State ---
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [savings, setSavings] = useState<SavingsGoal[]>([]);

    // ✅ CORRECCIÓN: Estado de categorías aquí dentro y como array de objetos
    const [categories, setCategories] = useState<Category[]>([]);

    // Filtramos las categorías para usarlas en la UI (Variables derivadas, no estados duplicados)
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    // UI State
    const [view, setView] = useState<'dashboard' | 'transactions' | 'savings' | 'reports' | 'installments' | 'settings'>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [chartMode, setChartMode] = useState<'expense' | 'income'>('expense');

    // Modal States
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [initialTab, setInitialTab] = useState<'manual' | 'ocr' | 'voice'>('manual');
    const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
    const [editingSavings, setEditingSavings] = useState<SavingsGoal | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    // Toast system
    const { toasts, toast, dismissToast } = useToast();

    // --- Date Period Helpers ---
    const getMonthRange = (offset: number = 0) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + offset;
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0); // last day of that month
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        return { start: fmt(start), end: fmt(end) };
    };

    // Filter State
    const [filterPeriod, setFilterPeriod] = useState<'current_month' | 'prev_month' | 'custom'>('current_month');
    const currentMonthRange = getMonthRange(0);
    const [filterStartDate, setFilterStartDate] = useState(currentMonthRange.start);
    const [filterEndDate, setFilterEndDate] = useState(currentMonthRange.end);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSearch, setFilterSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [sortOrder, setSortOrder] = useState<'date' | 'amount_asc' | 'amount_desc'>('date');

    const handlePeriodChange = (period: 'current_month' | 'prev_month' | 'custom') => {
        setFilterPeriod(period);
        if (period === 'current_month') {
            const range = getMonthRange(0);
            setFilterStartDate(range.start);
            setFilterEndDate(range.end);
        } else if (period === 'prev_month') {
            const range = getMonthRange(-1);
            setFilterStartDate(range.start);
            setFilterEndDate(range.end);
        }
        // 'custom' keeps existing dates
    };

    const [showFilters, setShowFilters] = useState(false); // Colapsar filtros
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Para historial de ahorros
    const [selectedSavingsHistory, setSelectedSavingsHistory] = useState<SavingsGoal | null>(null);

    // --- HELPER: Historial de Ahorros ---
    // Filtramos transacciones que sean de tipo "Ahorro" y mencionen la meta
    const getSavingsHistory = (goalName: string) => {
        return transactions
            .filter(t => t.category === 'Ahorro' && t.description.includes(goalName))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    // --- Effects ---
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const sessionUser = await AuthService.getSession();
        if (sessionUser) {
            setUser(sessionUser);
            loadUserData();
        }
        setAuthLoading(false);
    };

    // --- Cargar Datos (Actualiza tu loadUserData) ---
    const loadUserData = async () => {
        try {
            const [txData, savingsData, catsData] = await Promise.all([
                StorageService.getTransactions(),
                StorageService.getSavings(),
                StorageService.getCategories() // <--- Ahora cargamos desde API
            ]);
            setTransactions(txData);
            setSavings(savingsData);
            setCategories(catsData);
        } catch (error) { console.error(error); }
    };

    // --- Auth Actions ---
    // (Login, Register, Verify2FA, Logout same as before, see bottom for brevity if unchanged logic is huge, but included for completeness)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput || !passwordInput) return;
        setAuthLoading(true);
        const result = await AuthService.login(emailInput, passwordInput);
        setAuthLoading(false);
        if (result.status === '2fa_required') {
            setAuthView({ view: 'verify_2fa', email: emailInput, tempToken: result.tempToken });
            setOtpInput('');
        } else if (result.status === 'error') {
            alert(result.message);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput || !passwordInput || !nameInput) return;
        setAuthLoading(true);
        const result = await AuthService.register(nameInput, emailInput, passwordInput);
        setAuthLoading(false);
        if (result.success) {
            toast.success('Cuenta creada', 'Por favor inicia sesión.');
            setAuthView({ view: 'login', email: emailInput });
            setPasswordInput('');
        } else {
            toast.error('Error', result.message);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authView.tempToken) return;
        setAuthLoading(true);
        try {
            const userProfile = await AuthService.verify2FA(authView.tempToken, otpInput, rememberMe);
            if (userProfile) {
                setUser(userProfile);

                // 1. Usamos 'await' porque getTransactions va al servidor
                const existingTx = await StorageService.getTransactions();

                // Si no hay transacciones, verificamos si hay ahorros y si no, inicializamos
                if (existingTx.length === 0) {
                    const currentSavings = await StorageService.getSavings();
                    // Si el backend devuelve array vacío, cargamos los defaults uno por uno
                    if (currentSavings.length === 0) {
                        // Iteramos y guardamos cada meta inicial en la base de datos
                        for (const goal of INITIAL_SAVINGS) {
                            await StorageService.saveSavingsGoal({ ...goal, userId: userProfile.id });
                        }
                    }
                    // Volvemos a pedir los ahorros ya guardados
                    setSavings(await StorageService.getSavings());
                } else {
                    // Carga normal
                    await loadUserData();
                }
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        AuthService.logout();
        setUser(null);
        setAuthView({ view: 'login', email: '' });
        setEmailInput('');
        setPasswordInput('');
        setNameInput('');
    };

    const switchToRegister = () => { setAuthView({ view: 'register', email: '' }); setPasswordInput(''); setNameInput(''); };
    const switchToLogin = () => { setAuthView({ view: 'login', email: '' }); setPasswordInput(''); };

    // --- Transaction Logic ---
    const handleSaveTransaction = async (data: any) => {
        try {
            let updatedList;
            if (editingTransaction) {
                const updatedTx = { ...editingTransaction, ...data };
                updatedList = await StorageService.updateTransaction(updatedTx);
            } else {
                // Aseguramos que el ID lo genere el backend, no enviamos ID manual si es nuevo
                const newTx: Transaction = { ...data, userId: user?.id };
                if (newTx.id) delete newTx.id; // Dejamos que el backend ponga el ID
                updatedList = await StorageService.saveTransaction(newTx);
            }
            setTransactions(updatedList);
            setEditingTransaction(null);
        } catch (e) {
            toast.error('Error', 'No se pudo guardar el movimiento.');
        }
    };

    const handleEditTransaction = (t: Transaction) => { setEditingTransaction(t); setIsTransactionModalOpen(true); };

    const handleDeleteTransaction = async (id: string) => {
        // 1. Encontrar la transacción antes de borrarla
        const txToDelete = transactions.find(t => t.id === id);
        if (!txToDelete) return;

        if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;
        // TODO: Replace confirm with a custom modal in future iteration

        try {
            // 2. Lógica de Reversión de Ahorro
            // Si es un gasto de categoría "Ahorro", intentamos descontarlo de la meta
            if (txToDelete.category === 'Ahorro' && txToDelete.description.startsWith('Transferencia a: ')) {
                const goalName = txToDelete.description.replace('Transferencia a: ', '').trim();
                const goal = savings.find(g => g.name === goalName);

                if (goal) {
                    // Restamos el monto de la meta porque estamos borrando el ingreso a ella
                    // (Opcional: validar que no quede negativo)
                    const newCurrentAmount = Math.max(0, goal.currentAmount - txToDelete.amount);

                    const updatedGoal = { ...goal, currentAmount: newCurrentAmount };
                    const updatedSavingsList = await StorageService.saveSavingsGoal(updatedGoal);
                    setSavings(updatedSavingsList);
                }
            }

            // 3. Borrar la transacción
            const updated = await StorageService.deleteTransaction(id);
            setTransactions(updated);
            toast.success('Eliminado', 'El movimiento fue eliminado correctamente.');

        } catch (error) {
            console.error(error);
            toast.error('Error', 'No se pudo eliminar el movimiento.');
        }
    };

    // --- Savings & Transfer Logic ---
    const handleSaveSavings = async (data: any) => {
        try {
            let updatedList;
            if (editingSavings) {
                const updated = { ...editingSavings, ...data };
                updatedList = await StorageService.saveSavingsGoal(updated);
            } else {
                const newGoal: SavingsGoal = { ...data, userId: user?.id };
                // Eliminamos ID temporal si existe, el backend crea el suyo
                if (newGoal.id && newGoal.id.length > 10) delete newGoal.id;
                updatedList = await StorageService.saveSavingsGoal(newGoal);
            }
            setSavings(updatedList);
            setEditingSavings(null);
        } catch (e) {
            toast.error('Error', 'No se pudo guardar la meta de ahorro.');
        }
    };

    const handleEditSavings = (goal: SavingsGoal) => { setEditingSavings(goal); setIsSavingsModalOpen(true); };

    const handleDeleteSavings = async (id: string, e: React.MouseEvent) => {
        // Evita que el click llegue a elementos padre o extensiones
        e.preventDefault();
        e.stopPropagation();

        if (confirm('¿Estás seguro de eliminar esta meta de ahorro?')) {
            try {
                await StorageService.deleteSavingsGoal(id);
                setSavings(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error(error);
                toast.error('Error', 'No se pudo eliminar la meta.');
            }
        }
    };

    // --- App.tsx ---

    const handleTransferToSavings = async (goalId: string, amount: number) => {
        const goal = savings.find(s => s.id === goalId);
        if (!goal) return;

        // 1. Crear transacción de egreso (tipo 'expense')
        const newTx: Transaction = {
            id: '', // El backend generará el ID
            amount: amount,
            category: 'Ahorro',
            description: `Transferencia a: ${goal.name}`,
            date: new Date().toISOString().split('T')[0], // O usa getLocalDate() si ya la tienes
            type: 'expense',
            method: 'manual',
            paymentMethod: 'transfer',
            userId: user?.id
        };

        try {
            // AWAIT es clave aquí para evitar la pantalla blanca
            const updatedTxList = await StorageService.saveTransaction(newTx);
            setTransactions(updatedTxList);

            // 2. Actualizar la meta de ahorro (sumar monto)
            const updatedGoal = { ...goal, currentAmount: goal.currentAmount + amount };
            const updatedSavingsList = await StorageService.saveSavingsGoal(updatedGoal);
            setSavings(updatedSavingsList);

            // 3. Cerrar modal solo al terminar todo
            setIsTransferModalOpen(false);

            toast.success('Transferencia exitosa', `$${amount.toLocaleString('es-CO')} transferidos correctamente.`);

        } catch (error) {
            console.error("Error en transferencia:", error);
            toast.error('Error', 'Hubo un error al realizar la transferencia.');
        }
    };
    // --- Export Logic ---
    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            toast.warning('Sin datos', 'No hay movimientos para exportar con los filtros actuales.');
            return;
        }

        const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Método', 'Pago'];
        const rows = filteredTransactions.map(t => [
            t.date,
            t.type === 'income' ? 'Ingreso' : 'Gasto',
            `"${t.category.replace(/"/g, '""')}"`, // Escape quotes
            `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
            t.amount,
            t.method === 'ocr' ? 'OCR' : t.method === 'voice' ? 'Voz' : 'Manual',
            t.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `movimientos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Derived Data (With Filters applied) ---
    const filteredTransactions = useMemo(() => {
        // 1. Primero filtramos (la lógica que ya tenías)
        const filtered = transactions.filter(t => {
            let matches = true;
            if (filterStartDate && t.date < filterStartDate) matches = false;
            if (filterEndDate && t.date > filterEndDate) matches = false;
            if (filterCategory && t.category !== filterCategory) matches = false;
            if (filterType !== 'all' && t.type !== filterType) matches = false;
            if (filterSearch && !t.description.toLowerCase().includes(filterSearch.toLowerCase()) && !t.category.toLowerCase().includes(filterSearch.toLowerCase())) matches = false;
            return matches;
        });

        // 2. Luego ordenamos (NUEVA LÓGICA)
        return filtered.sort((a, b) => {
            if (sortOrder === 'amount_desc') {
                return b.amount - a.amount; // Mayor a Menor
            } else if (sortOrder === 'amount_asc') {
                return a.amount - b.amount; // Menor a Mayor
            } else {
                // Por defecto: Fecha más reciente primero (orden descendente de fecha)
                return b.date.localeCompare(a.date);
            }
        });
    }, [transactions, filterStartDate, filterEndDate, filterCategory, filterType, sortOrder, filterSearch]); // <--- Agregamos sortOrder y filterSearch aquí

    const dashboardData = useMemo(() => {
        const dataToUse = filteredTransactions;

        // Filtered period totals (for charts, pies)
        const totalIncome = dataToUse.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = dataToUse.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

        // REAL balance = ALL-TIME income - ALL-TIME expenses (not filtered)
        const allTimeIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const allTimeExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const realBalance = allTimeIncome - allTimeExpense;
        const totalSavings = savings.reduce((acc, s) => acc + s.currentAmount, 0);

        // --- Trend: Compare with previous month ---
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().substring(0, 10);

        const currentMonthTx = transactions.filter(t => t.date >= currentMonthStart && t.date <= currentMonthEnd);
        const prevMonthTx = transactions.filter(t => t.date >= prevMonthStart && t.date <= prevMonthEnd);

        const curIncome = currentMonthTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const prevIncome = prevMonthTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const curExpense = currentMonthTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
        const prevExpense = prevMonthTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

        const incomeTrend = prevIncome > 0 ? Math.round(((curIncome - prevIncome) / prevIncome) * 100) : (curIncome > 0 ? 100 : 0);
        const expenseTrend = prevExpense > 0 ? Math.round(((curExpense - prevExpense) / prevExpense) * 100) : (curExpense > 0 ? 100 : 0);

        // -- Pies --
        const expensesByCategory = dataToUse.filter(t => t.type === 'expense').reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
        }, {} as Record<string, number>);
        const expensePieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

        const incomeByCategory = dataToUse.filter(t => t.type === 'income').reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
        }, {} as Record<string, number>);
        const incomePieData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));

        // -- Area Data --
        const dailyMap = dataToUse.reduce((acc, t) => {
            const dateKey = typeof t.date === 'string' ? t.date.substring(0, 10) : new Date(t.date).toISOString().substring(0, 10);
            if (!acc[dateKey]) acc[dateKey] = { income: 0, expense: 0 };
            if (t.type === 'income') acc[dateKey].income += t.amount;
            else acc[dateKey].expense += t.amount;
            return acc;
        }, {} as Record<string, { income: number, expense: number }>);

        const sortedDates = Object.keys(dailyMap).sort();
        let runningAccumulator = 0;

        const areaData = sortedDates.map(dateKey => {
            const entry = dailyMap[dateKey];
            if (chartMode === 'income') {
                runningAccumulator += entry.income;
            } else {
                runningAccumulator += entry.expense;
            }
            const balanceValue = runningAccumulator;
            const [y, m, d] = dateKey.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const displayDate = dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
            return {
                name: displayDate,
                saldo: balanceValue,
                originalDate: dateKey,
                ingresoDiario: entry.income,
                gastoDiario: entry.expense
            };
        });

        // --- Recent transactions (last 5) ---
        const recentTransactions = [...transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5);

        return { totalIncome, totalExpense, balance: realBalance, totalSavings, expensePieData, incomePieData, areaData, incomeTrend, expenseTrend, recentTransactions };
    }, [filteredTransactions, transactions, savings, chartMode]);

    // --- Render Auth Views ---
    if (authLoading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/30 animate-pulse">
                DS
            </div>
            <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-slate-400">DeerSystems</p>
                <p className="text-[9px] text-emerald-500 uppercase tracking-widest font-medium">Financial IA</p>
            </div>
            <div className="mt-4 w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-emerald-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                    style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}></div>
            </div>
        </div>
    );

    if (!user) {
        return (
            <Auth
                authView={authView}
                setAuthView={setAuthView}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
                handleVerify2FA={handleVerify2FA}
                emailInput={emailInput}
                setEmailInput={setEmailInput}
                passwordInput={passwordInput}
                setPasswordInput={setPasswordInput}
                nameInput={nameInput}
                setNameInput={setNameInput}
                otpInput={otpInput}
                setOtpInput={setOtpInput}
                rememberMe={rememberMe}
                setRememberMe={setRememberMe}
            />
        );
    }

    // --- Main App Render ---
    return (
        <Layout user={user} onLogout={handleLogout} currentView={view} onNavigate={setView}>
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">

                {/* Filter Component Reusable (Optimizado Mobile & Desktop) */}
                {(view === 'dashboard' || view === 'transactions') && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6 overflow-hidden">

                        {/* Cabecera del Filtro (Click para abrir/cerrar en móvil) */}
                        <div
                            onClick={() => setShowFilters(!showFilters)}
                            className="p-4 flex justify-between items-center cursor-pointer md:cursor-default"
                        >
                            <div className="flex items-center gap-2 text-slate-300">
                                <Filter size={18} />
                                <span className="text-sm font-bold">Filtrar y Ordenar</span>
                            </div>
                            {/* Icono Chevron solo visible en móvil */}
                            <div className="md:hidden text-slate-500">
                                {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {/* Contenido Colapsable (Siempre visible en MD, toggle en Mobile) */}
                        <div className={`px-4 pb-4 ${showFilters ? 'block' : 'hidden'} md:block`}>
                            {/* --- Period Quick Buttons --- */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                    onClick={() => handlePeriodChange('current_month')}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${filterPeriod === 'current_month'
                                        ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/20'
                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                                        }`}
                                >
                                    <CalendarDays size={14} /> Mes Actual
                                </button>
                                <button
                                    onClick={() => handlePeriodChange('prev_month')}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${filterPeriod === 'prev_month'
                                        ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/20'
                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                                        }`}
                                >
                                    <CalendarDays size={14} /> Mes Anterior
                                </button>
                                <button
                                    onClick={() => handlePeriodChange('custom')}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${filterPeriod === 'custom'
                                        ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/20'
                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                                        }`}
                                >
                                    <CalendarDays size={14} /> Personalizado
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 w-full">
                                {/* Search */}
                                <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-slate-500"><Search size={16} /></span>
                                    <input
                                        type="text"
                                        placeholder="Buscar detalle..."
                                        value={filterSearch}
                                        onChange={(e) => setFilterSearch(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-3 text-xs text-white focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>

                                {/* Custom Date Pickers (only visible when filterPeriod === 'custom') */}
                                {filterPeriod === 'custom' && (
                                    <>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-500 text-[10px] pointer-events-none">DESDE</span>
                                            <input
                                                type="date"
                                                value={filterStartDate}
                                                onChange={(e) => setFilterStartDate(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 pb-2 pt-6 text-xs text-white min-h-[50px] focus:ring-1 focus:ring-primary-500"
                                            />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-500 text-[10px] pointer-events-none">HASTA</span>
                                            <input
                                                type="date"
                                                value={filterEndDate}
                                                onChange={(e) => setFilterEndDate(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 pb-2 pt-6 text-xs text-white min-h-[50px] focus:ring-1 focus:ring-primary-500"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* SELECTS */}
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-xs text-white w-full appearance-none pr-8"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    <option value="all">Todos los Tipos</option>
                                    <option value="income">Ingresos</option>
                                    <option value="expense">Gastos</option>
                                </select>

                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-xs text-white w-full pr-8"
                                >
                                    <option value="">Todas las Categorías</option>
                                    <optgroup label="Gastos">{expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</optgroup>
                                    <optgroup label="Ingresos">{incomeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</optgroup>
                                </select>

                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-xs text-white font-medium w-full pr-8"
                                >
                                    <option value="date">📅 Fecha (Reciente)</option>
                                    <option value="amount_desc">💰 Mayor a Menor</option>
                                    <option value="amount_asc">💰 Menor a Mayor</option>
                                </select>
                            </div>

                            {(filterCategory || filterType !== 'all' || sortOrder !== 'date' || filterSearch) && (
                                <button
                                    onClick={() => { handlePeriodChange('current_month'); setFilterCategory(''); setFilterType('all'); setSortOrder('date'); setFilterSearch(''); }}
                                    className="mt-3 w-full sm:w-auto bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors border border-slate-600/50"
                                >
                                    <X size={14} /> Limpiar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* --- DASHBOARD VIEW --- */}
                {view === 'dashboard' && (
                    <>
                        {/* Top Stats - Hero Cards with Trend Indicators */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {/* Balance Card */}
                            <div className="col-span-2 bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-2xl p-5 md:p-6 border border-slate-700 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Saldo Disponible</p>
                                <h2 className={`text-3xl md:text-4xl font-bold ${dashboardData.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${formatMoney(dashboardData.balance)}
                                </h2>
                                <p className="text-[10px] text-slate-500 mt-1">Balance del periodo seleccionado</p>
                            </div>

                            {/* Income Card */}
                            <div
                                onClick={() => { setView('transactions'); setFilterType('income'); setFilterCategory(''); }}
                                className="bg-slate-800/80 rounded-2xl p-4 md:p-5 border border-slate-700/80 flex flex-col justify-between cursor-pointer hover:border-emerald-500/30 transition-all group"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-slate-400 text-[11px] font-medium uppercase group-hover:text-emerald-300 transition-colors">Ingresos</p>
                                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500"><TrendingUp size={14} /></div>
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-emerald-400">+${formatMoney(dashboardData.totalIncome)}</h2>
                                {dashboardData.incomeTrend !== 0 && (
                                    <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${dashboardData.incomeTrend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                        {dashboardData.incomeTrend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {dashboardData.incomeTrend >= 0 ? '+' : ''}{dashboardData.incomeTrend}% vs mes anterior
                                    </div>
                                )}
                            </div>

                            {/* Expense Card */}
                            <div
                                onClick={() => { setView('transactions'); setFilterType('expense'); setFilterCategory(''); }}
                                className="bg-slate-800/80 rounded-2xl p-4 md:p-5 border border-slate-700/80 flex flex-col justify-between cursor-pointer hover:border-red-500/30 transition-all group"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-slate-400 text-[11px] font-medium uppercase group-hover:text-red-300 transition-colors">Egresos</p>
                                    <div className="p-1.5 rounded-lg bg-red-500/15 text-red-500"><TrendingDown size={14} /></div>
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-red-400">-${formatMoney(dashboardData.totalExpense)}</h2>
                                {dashboardData.expenseTrend !== 0 && (
                                    <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${dashboardData.expenseTrend <= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                        {dashboardData.expenseTrend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {dashboardData.expenseTrend > 0 ? '+' : ''}{dashboardData.expenseTrend}% vs mes anterior
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Secondary row: Savings + Recent */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                            {/* Savings Summary */}
                            <div
                                onClick={() => { setView('savings'); }}
                                className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 flex flex-col justify-center cursor-pointer hover:border-blue-500/30 transition-all group"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-slate-400 text-[11px] font-medium uppercase group-hover:text-blue-300 transition-colors">Ahorro Total</p>
                                    <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500"><PiggyBank size={14} /></div>
                                </div>
                                <h2 className="text-2xl font-bold text-blue-400">${formatMoney(dashboardData.totalSavings)}</h2>
                                <p className="text-[10px] text-slate-500 mt-1">{savings.length} meta{savings.length !== 1 ? 's' : ''} activa{savings.length !== 1 ? 's' : ''}</p>
                            </div>

                            {/* Recent Transactions Widget */}
                            <div className="lg:col-span-2 bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-700/50 flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-300">Últimos Movimientos</h4>
                                    <button
                                        onClick={() => setView('transactions')}
                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider"
                                    >
                                        Ver todos →
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-700/30">
                                    {dashboardData.recentTransactions.length === 0 && (
                                        <div className="px-5 py-8 text-center text-sm text-slate-500">
                                            No hay movimientos aún.
                                        </div>
                                    )}
                                    {dashboardData.recentTransactions.map(t => {
                                        const catObj = categories.find(c => c.name === t.category);
                                        const CatIcon = catObj ? (LucideIcons as any)[catObj.icon] || LucideIcons.Circle : LucideIcons.Circle;
                                        const iconColor = t.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/10 text-red-400';
                                        const cleanDate = typeof t.date === 'string' ? t.date.substring(0, 10) : new Date(t.date).toISOString().substring(0, 10);
                                        const [, mm, dd] = cleanDate.split('-');
                                        const mNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => { handleEditTransaction(t); }}
                                                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/20 cursor-pointer transition-colors"
                                            >
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                                                    <CatIcon size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-200 truncate">{t.category}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{t.description || 'Sin notas'} • {dd} {mNames[parseInt(mm) - 1]}</p>
                                                </div>
                                                <span className={`font-bold text-sm flex-shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Charts Controls */}
                        <div className="flex justify-between items-center mt-4">
                            <h3 className="text-lg font-bold text-white">Análisis Gráfico</h3>
                            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                <button
                                    onClick={() => setChartMode('expense')}
                                    className={`px-4 py-1 text-xs rounded-md transition-all ${chartMode === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Gastos
                                </button>
                                <button
                                    onClick={() => setChartMode('income')}
                                    className={`px-4 py-1 text-xs rounded-md transition-all ${chartMode === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Ingresos
                                </button>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                                <h3 className="text-sm font-bold mb-6 text-slate-300">
                                    {chartMode === 'expense' ? 'Tendencia de Gastos (Acumulado)' : 'Tendencia de Ingresos (Acumulado)'}
                                </h3>
                                <BalanceAreaChart data={dashboardData.areaData} />
                            </div>
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                                <h3 className="text-sm font-bold mb-6 text-slate-300">
                                    {chartMode === 'expense' ? 'Distribución de Gastos' : 'Distribución de Ingresos'}
                                </h3>
                                <CategoryPieChart data={chartMode === 'expense' ? dashboardData.expensePieData : dashboardData.incomePieData} />
                            </div>
                        </div>

                        {/* --- NUEVA GRÁFICA COMPARATIVA --- */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm mb-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-300">
                                    Comparativa: Ingresos vs Gastos
                                </h3>
                                {/* Pequeño badge informativo */}
                                <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                                    Periodo Seleccionado
                                </span>
                            </div>

                            {/* Pasamos 'areaData' que ya tiene ingresoDiario y gastoDiario calculados */}
                            <ComparisonBarChart data={dashboardData.areaData} />
                        </div>

                        {/* --- BUDGET TRACKER EXTENSION --- */}
                        <div className="mb-8">
                            <BudgetTracker
                                transactions={transactions}
                                categories={categories}
                            />
                        </div>
                    </>
                )}

                {/* --- TRANSACTIONS VIEW --- */}
                {view === 'transactions' && (
                    <TransactionsView
                        filteredTransactions={filteredTransactions}
                        categories={categories}
                        onEditTransaction={handleEditTransaction}
                        onDeleteTransaction={handleDeleteTransaction}
                        onExportCSV={handleExportCSV}
                        onOpenTransferModal={() => setIsTransferModalOpen(true)}
                    />
                )}

                {/* --- SAVINGS VIEW --- */}
                {view === 'savings' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setIsTransferModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20"
                            >
                                <ArrowRightLeft size={18} /> Transferir Fondos
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savings.map(goal => {
                                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                                return (
                                    <div
                                        key={goal.id}
                                        onClick={() => setSelectedSavingsHistory(goal)}
                                        className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col gap-4 relative group cursor-pointer hover:border-slate-500 transition-all"
                                    >
                                        {/* --- BOTONES DE ACCIÓN (Siempre visibles ahora) --- */}
                                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                                            {/* 1. Botón Editar */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Evita abrir el historial
                                                    handleEditSavings(goal);
                                                }}
                                                className="p-2 bg-slate-700/80 hover:bg-blue-600 text-slate-300 hover:text-white rounded-full transition-colors border border-slate-600"
                                                title="Editar Meta"
                                            >
                                                <Edit2 size={16} />
                                            </button>

                                            {/* 2. Botón Eliminar */}
                                            <button
                                                onClick={(e) => handleDeleteSavings(goal.id, e)}
                                                className="p-2 bg-slate-700/80 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-colors border border-slate-600"
                                                title="Eliminar Meta"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-start">
                                            <div className="p-3 rounded-xl bg-slate-700 text-white">
                                                <DollarSign size={24} style={{ color: goal.color }} />
                                            </div>
                                            <span className="text-2xl font-bold text-white">${formatMoney(goal.currentAmount)}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-200">{goal.name}</h4>
                                            <p className="text-xs text-slate-500">Meta: ${formatMoney(goal.targetAmount)}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-medium text-slate-400">
                                                <span>Progreso</span>
                                                <span>{percent}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ width: `${percent}%`, backgroundColor: goal.color }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div
                                onClick={() => {
                                    setEditingSavings(null);
                                    setIsSavingsModalOpen(true);
                                }}
                                className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-primary-500 hover:text-primary-500 transition-all cursor-pointer min-h-[200px]"
                            >
                                <Plus size={40} />
                                <span className="mt-2 font-medium">Nueva Meta</span>
                            </div>
                        </div>
                    </>
                )}

                {/* --- REPORTS VIEW --- */}
                {view === 'reports' && (
                    <ReportsView
                        transactions={transactions}
                        categories={categories}
                    />
                )}

                {/* --- INSTALLMENTS VIEW --- */}
                {view === 'installments' && (
                    <InstallmentsView
                        onPayInstallment={async (inst, amount) => {
                            // Create an expense transaction for the installment payment
                            try {
                                const txData = {
                                    amount,
                                    description: `Cuota: ${inst.name}`,
                                    category: inst.category || 'Cuotas',
                                    type: 'expense' as const,
                                    date: new Date().toISOString().substring(0, 10),
                                    paymentMethod: 'transfer' as const,
                                    method: 'manual' as const
                                };
                                const updatedTx = await StorageService.saveTransaction(txData as any);
                                setTransactions(updatedTx);
                                toast.success('Pago registrado', `Cuota de ${inst.name} por $${amount.toLocaleString()} registrada como gasto.`);
                            } catch (err) {
                                toast.error('Error', 'No se pudo registrar el pago como movimiento.');
                            }
                        }}
                    />
                )}

                {/* --- SETTINGS VIEW --- */}
                {view === 'settings' && user && (
                    <SettingsView
                        user={user}
                        onUpdateUser={setUser}
                        categories={categories}
                        onUpdateCategories={setCategories}
                    />
                )}

            </div>

            {/* Quick Actions FAB — visible on dashboard and transactions */}
            {view !== 'settings' && (
                <QuickActionsFAB
                    onManual={() => { setEditingTransaction(null); setInitialTab('manual'); setIsTransactionModalOpen(true); }}
                    onScan={() => { setEditingTransaction(null); setInitialTab('ocr'); setIsTransactionModalOpen(true); }}
                    onVoice={() => { setEditingTransaction(null); setInitialTab('voice'); setIsTransactionModalOpen(true); }}
                    onTransfer={() => setIsTransferModalOpen(true)}
                />
            )}

            {/* Modals */}
            <TransactionModal isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); setInitialTab('manual'); }} onSave={handleSaveTransaction} initialData={editingTransaction} expenseCategories={expenseCategories} incomeCategories={incomeCategories} initialTab={initialTab} onCategoryCreated={(newCat) => setCategories(prev => [...prev, newCat])} />
            <SavingsModal isOpen={isSavingsModalOpen} onClose={() => { setIsSavingsModalOpen(false); setEditingSavings(null); }} onSave={handleSaveSavings} initialData={editingSavings} />
            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                savingsGoals={savings}
                onTransfer={handleTransferToSavings}
                currentBalance={dashboardData.balance} // <--- NUEVA PROP: Pasamos el saldo
            />
            {/* --- MODAL HISTORIAL DE AHORROS --- */}
            {
                selectedSavingsHistory && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSavingsHistory(null)}>
                        <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-850">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <History size={18} className="text-primary-500" /> Historial: {selectedSavingsHistory.name}
                                </h3>
                                <button onClick={() => setSelectedSavingsHistory(null)}><X size={20} className="text-slate-400" /></button>
                            </div>
                            <div className="p-0 max-h-[60vh] overflow-y-auto">
                                {getSavingsHistory(selectedSavingsHistory.name).length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">No hay movimientos registrados para esta meta.</div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <tbody className="divide-y divide-slate-700">
                                            {getSavingsHistory(selectedSavingsHistory.name).map(tx => (
                                                <tr key={tx.id} className="bg-slate-800">
                                                    <td className="p-4">
                                                        <div className="text-white font-medium">{tx.date.substring(0, 10)}</div>
                                                        <div className="text-xs text-slate-500">Aporte manual/transferencia</div>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-emerald-400">
                                                        +${formatMoney(tx.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        </Layout>
    );
}

export default App;