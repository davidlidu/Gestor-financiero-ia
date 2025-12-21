import React, { useEffect, useState, useMemo } from 'react';
import { Settings, Plus, LayoutDashboard, Wallet, PieChart, Menu, LogOut, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, Pencil, Filter, X, Lock, Mail, User as UserIcon, ShieldCheck, PiggyBank, ArrowRightLeft, Link as LinkIcon, Save, Camera, UploadCloud, Download } from 'lucide-react';
import { Transaction, UserProfile, SavingsGoal, AuthState, Category } from './types';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { BalanceAreaChart, CategoryPieChart, ComparisonBarChart } from './components/Charts';
import { TransactionModal } from './components/TransactionModal';
import { SavingsModal } from './components/SavingsModal';
import { TransferModal } from './components/TransferModal'; // Imported TransferModal
import { INITIAL_SAVINGS, DEFAULT_EXPENSE_CATEGORIES } from './constants';
import * as LucideIcons from 'lucide-react';

// Componente para seleccionar iconos
const IconSelector = ({ selected, onSelect }: { selected: string, onSelect: (i: string) => void }) => {
    const icons = ['Utensils', 'Bus', 'Home', 'Zap', 'Film', 'Heart', 'Book', 'ShoppingBag', 'Briefcase', 'Laptop', 'Gift', 'TrendingUp', 'Coffee', 'Car', 'Smartphone', 'Music', 'DollarSign', 'CreditCard', 'Smile'];

    return (
        <div className="grid grid-cols-6 gap-2 mt-2 p-2 bg-slate-900 rounded-lg border border-slate-700 max-h-32 overflow-y-auto">
            {icons.map(iconName => {
                const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
                return (
                    <button key={iconName} onClick={() => onSelect(iconName)}
                        className={`p-2 rounded flex justify-center items-center ${selected === iconName ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                        <Icon size={18} />
                    </button>
                )
            })}
        </div>
    );
};

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
    const [view, setView] = useState<'dashboard' | 'transactions' | 'savings' | 'settings'>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [chartMode, setChartMode] = useState<'expense' | 'income'>('expense');

    // Modal States
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
    const [editingSavings, setEditingSavings] = useState<SavingsGoal | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    // Filter State
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    // Settings State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');
    const [newCategoryIcon, setNewCategoryIcon] = useState('DollarSign');

    const [settingsN8nUrl, setSettingsN8nUrl] = useState('');
    const [settingsAvatar, setSettingsAvatar] = useState('');
    const [settingsNewPassword, setSettingsNewPassword] = useState('');

    // --- Effects ---
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const sessionUser = await AuthService.getSession();
        if (sessionUser) {
            setUser(sessionUser);
            loadUserData();
            // Init settings fields
            setSettingsN8nUrl(sessionUser.n8nUrl || '');
            setSettingsAvatar(sessionUser.avatar || '');
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
            alert("Cuenta creada exitosamente. Por favor inicia sesión.");
            setAuthView({ view: 'login', email: emailInput });
            setPasswordInput('');
        } else {
            alert(result.message);
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

                setSettingsN8nUrl(userProfile.n8nUrl || '');
                setSettingsAvatar(userProfile.avatar || '');
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
            alert("Error guardando movimiento");
        }
    };

    const handleEditTransaction = (t: Transaction) => { setEditingTransaction(t); setIsTransactionModalOpen(true); };

    const handleDeleteTransaction = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este movimiento?')) {
            const updated = await StorageService.deleteTransaction(id);
            setTransactions(updated);
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
            alert("Error guardando meta de ahorro");
        }
    };

    const handleEditSavings = (goal: SavingsGoal) => { setEditingSavings(goal); setIsSavingsModalOpen(true); };

    const handleDeleteSavings = async (id: string, e: React.MouseEvent) => {
        // Evita que el click llegue a elementos padre o extensiones
        e.preventDefault();
        e.stopPropagation(); 
        
        if(confirm('¿Estás seguro de eliminar esta meta de ahorro?')) {
          try {
            await StorageService.deleteSavingsGoal(id);
            setSavings(prev => prev.filter(s => s.id !== id));
          } catch (error) {
            console.error(error);
            alert("Error al eliminar la meta");
          }
        }
    };

    const handleTransferToSavings = (goalId: string, amount: number) => {
        // 1. Create an Expense Transaction
        const goal = savings.find(s => s.id === goalId);
        const newTx: Transaction = {
            id: Date.now().toString(),
            amount: amount,
            category: 'Ahorro', // Ensure this category exists or is handled
            description: `Transferencia a: ${goal?.name}`,
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            method: 'manual',
            paymentMethod: 'transfer',
            userId: user?.id
        };
        StorageService.saveTransaction(newTx);
        setTransactions(StorageService.getTransactions());

        // 2. Update Savings Goal
        if (goal) {
            const updatedGoal = { ...goal, currentAmount: goal.currentAmount + amount };
            const updatedSavings = StorageService.saveSavingsGoal(updatedGoal);
            setSavings(updatedSavings);
        }
        // Cerramos el modal
        setIsTransferModalOpen(false);
    };

    // --- Export Logic ---
    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            alert("No hay movimientos para exportar con los filtros actuales.");
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

    // --- User Settings Logic ---
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB Limit
            alert("La imagen es muy grande. Máximo 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) {
                setSettingsAvatar(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSettings = () => {
        if (!user) return;
        const updatedUser = {
            ...user,
            n8nUrl: settingsN8nUrl,
            avatar: settingsAvatar,
            password: settingsNewPassword ? settingsNewPassword : user.password // In real app, hash this
        };
        StorageService.saveUser(updatedUser); // Update local persist
        // Also update "DB"
        const users = JSON.parse(localStorage.getItem('lidutech_db_users') || '[]');
        const index = users.findIndex((u: any) => u.id === user.id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updatedUser };
            localStorage.setItem('lidutech_db_users', JSON.stringify(users));
        }

        setUser(updatedUser);
        setSettingsNewPassword('');
        alert('Configuración guardada correctamente.');
    };

    // --- Category Logic ---
    const handleAddCategory = async () => {
        if(!newCategoryName.trim()) return;
        
        try {
            const newCat = await StorageService.createCategory({
                name: newCategoryName,
                icon: newCategoryIcon,
                type: newCategoryType
            });
            
            // Actualizamos el estado global de categorías
            setCategories([...categories, newCat]); 
            
            // Reseteamos el formulario
            setNewCategoryName('');
            setNewCategoryIcon('DollarSign');
        } catch (e) { 
            alert("Error creando categoría"); 
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm(`¿Eliminar esta categoría?`)) return;
        try {
            await StorageService.deleteCategory(id);
            setCategories(categories.filter(c => c.id !== id));
        } catch (e) { alert("Error eliminando categoría"); }
    };

    // --- Derived Data (With Filters applied) ---
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            let matches = true;
            if (filterStartDate && t.date < filterStartDate) matches = false;
            if (filterEndDate && t.date > filterEndDate) matches = false;
            if (filterCategory && t.category !== filterCategory) matches = false;
            if (filterType !== 'all' && t.type !== filterType) matches = false;
            return matches;
        });
    }, [transactions, filterStartDate, filterEndDate, filterCategory, filterType]);

    const dashboardData = useMemo(() => {
        const dataToUse = filteredTransactions;

        const totalIncome = dataToUse.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = dataToUse.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const balance = totalIncome - totalExpense;
        const totalSavings = savings.reduce((acc, s) => acc + s.currentAmount, 0);

        // -- Pies --
        const expensesByCategory = dataToUse.filter(t => t.type === 'expense').reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
        }, {} as Record<string, number>);
        const expensePieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

        const incomeByCategory = dataToUse.filter(t => t.type === 'income').reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
        }, {} as Record<string, number>);
        const incomePieData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));

        // -- Area Data (Corregido) --
        const dailyMap = dataToUse.reduce((acc, t) => {
            // Normalización robusta de fecha (Toma los primeros 10 chars YYYY-MM-DD)
            const dateKey = typeof t.date === 'string' ? t.date.substring(0, 10) : new Date(t.date).toISOString().substring(0, 10);
            
            if (!acc[dateKey]) acc[dateKey] = { income: 0, expense: 0 };
            
            if (t.type === 'income') acc[dateKey].income += t.amount;
            else acc[dateKey].expense += t.amount;
            
            return acc;
        }, {} as Record<string, { income: number, expense: number }>);

        const sortedDates = Object.keys(dailyMap).sort();
        let runningAccumulator = 0; // Acumulador dinámico

        const areaData = sortedDates.map(dateKey => {
            const entry = dailyMap[dateKey];
            
            // Lógica condicional según el modo del gráfico
            if (chartMode === 'income') {
                runningAccumulator += entry.income;
                // Si quieres ver solo lo del día, usa entry.income. Si quieres acumulado, runningAccumulator
            } else {
                runningAccumulator += entry.expense;
            }
            
            // Para el modo 'balance' (general), sería ingreso - gasto
            const balanceValue = chartMode === 'income' ? runningAccumulator : runningAccumulator; 

            // Formateo de fecha seguro
            const [y, m, d] = dateKey.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const displayDate = dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

            return {
                name: displayDate,
                saldo: balanceValue, // Recharts usa esta key según tu componente Charts.tsx
                originalDate: dateKey
            };
        });

        return { totalIncome, totalExpense, balance, totalSavings, expensePieData, incomePieData, areaData };
    }, [filteredTransactions, savings, chartMode]); // <--- Importante: agregar chartMode a dependencias

    // --- Render Auth Views ---
    if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-primary-500"><div className="animate-spin text-4xl">...</div></div>;

    if (!user) {
        // ... (Login/Register Forms - kept same as provided previously)
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-40 right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
                </div>

                <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 z-10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-500 mb-2">Gestor de Finanzas AI</h1>
                        <p className="text-slate-400">
                            {authView.view === 'login' && 'Bienvenid@'}
                            {authView.view === 'register' && 'Crea tu cuenta segura'}
                            {authView.view === 'verify_2fa' && 'Verificación de Seguridad'}
                        </p>
                    </div>

                    {authView.view === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Correo Electrónico</label>
                                <div className="relative"><Mail className="absolute left-3 top-3 text-slate-500" size={16} /><input type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none" placeholder="ejemplo@correo.com" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
                                <div className="relative"><Lock className="absolute left-3 top-3 text-slate-500" size={16} /><input type="password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none" placeholder="••••••••" /></div>
                            </div>
                            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-primary-500/20 mt-2">Iniciar Sesión</button>
                            <div className="text-center mt-4"><p className="text-xs text-slate-500">¿No tienes cuenta? <button type="button" onClick={switchToRegister} className="text-primary-400 hover:underline">Regístrate aquí</button></p></div>
                        </form>
                    )}

                    {authView.view === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Completo</label>
                                <div className="relative"><UserIcon className="absolute left-3 top-3 text-slate-500" size={16} /><input type="text" required value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Juan Pérez" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Correo Electrónico</label>
                                <div className="relative"><Mail className="absolute left-3 top-3 text-slate-500" size={16} /><input type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none" placeholder="ejemplo@correo.com" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
                                <div className="relative"><Lock className="absolute left-3 top-3 text-slate-500" size={16} /><input type="password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none" placeholder="••••••••" /></div>
                            </div>
                            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-primary-500/20 mt-2">Crear Cuenta</button>
                            <div className="text-center mt-4"><p className="text-xs text-slate-500">¿Ya tienes cuenta? <button type="button" onClick={switchToLogin} className="text-primary-400 hover:underline">Inicia sesión</button></p></div>
                        </form>
                    )}

                    {authView.view === 'verify_2fa' && (
                        <form onSubmit={handleVerify2FA} className="space-y-4">
                            <div className="text-center bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-4">
                                <ShieldCheck size={48} className="text-primary-500 mx-auto mb-2" />
                                <p className="text-sm text-slate-300">Código enviado a:</p>
                                <p className="text-white font-medium mb-3">{authView.email}</p>

                            </div>
                            <div><label className="block text-xs font-medium text-slate-400 mb-1 text-center">Ingresa el código</label><input type="text" required maxLength={6} value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono" placeholder="000000" /></div>
                            <div className="flex items-center gap-2 py-2"><input type="checkbox" id="rememberDevice" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500 bg-slate-900" /><label htmlFor="rememberDevice" className="text-sm text-slate-400 cursor-pointer">No pedir código en este dispositivo</label></div>
                            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-primary-500/20">Verificar Acceso</button>
                            <button type="button" onClick={switchToLogin} className="w-full text-xs text-slate-500 hover:text-white mt-2">Cancelar y volver</button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // --- Main App Render ---
    return (
        <div className="min-h-screen flex bg-slate-900 text-slate-100 font-sans overflow-x-hidden">

            {/* Sidebar (Desktop) */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-850 border-r border-slate-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-primary-500 to-blue-600"></div>
                        <h1 className="font-bold text-xl tracking-tight">Mis Finanzas AI</h1>
                    </div>

                    <nav className="flex-1 p-4 space-y-2">
                        <button onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20' : 'text-slate-400 hover:bg-slate-800border border-transparent'}`}>
                            <LayoutDashboard size={20} /> Dashboard
                        </button>
                        <button onClick={() => { setView('transactions'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'transactions' ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20' : 'text-slate-400 hover:bg-slate-800border border-transparent'}`}>
                            <Wallet size={20} /> Movimientos
                        </button>
                        <button onClick={() => { setView('savings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'savings' ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20' : 'text-slate-400 hover:bg-slate-800border border-transparent'}`}>
                            <PieChart size={20} /> Ahorros
                        </button>
                    </nav>

                    <div className="p-4 border-t border-slate-700">
                        <div className="flex items-center gap-3 px-4 py-3 mb-2">
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full object-cover bg-slate-700 border border-slate-600" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white bg-gradient-to-tr from-primary-500 to-blue-500">
                                    {user.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                            <button onClick={() => { setView('settings'); setIsMobileMenuOpen(false); }} className="hover:text-primary-400 transition-colors">
                                <Settings size={18} />
                            </button>
                        </div>
                        <button onClick={handleLogout} className="w-full flex items-center gap-2 justify-center text-xs text-red-400 hover:text-red-300 py-2">
                            <LogOut size={14} /> Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 relative w-full">
                {/* Header Mobile */}
                <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 p-4 flex justify-between items-center lg:hidden">
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300">
                        <Menu />
                    </button>
                    <span className="font-bold">Lidutech Finanzas</span>
                    <div className="w-8"></div>
                </header>

                <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">

                    {/* Filter Component Reusable */}
                    {(view === 'dashboard' || view === 'transactions') && (
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col md:flex-row gap-4 items-center mb-6">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Filter size={18} />
                                <span className="text-sm font-medium">Filtrar:</span>
                            </div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                                <input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white"
                                    placeholder="Desde"
                                />
                                <input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white"
                                    placeholder="Hasta"
                                />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white"
                                >
                                    <option value="all">Todos los Tipos</option>
                                    <option value="income">Ingresos</option>
                                    <option value="expense">Gastos</option>
                                </select>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white"
                                >
                                    <option value="">Todas las Categorías</option>
                                    <optgroup label="Gastos">
                                        {/* Usamos c.id y c.name */}
                                        {expenseCategories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Ingresos">
                                        {/* Usamos c.id y c.name */}
                                        {incomeCategories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            {(filterStartDate || filterEndDate || filterCategory || filterType !== 'all') && (
                                <button
                                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterCategory(''); setFilterType('all'); }}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                                >
                                    <X size={14} /> Limpiar
                                </button>
                            )}
                        </div>
                    )}

                    {/* --- DASHBOARD VIEW --- */}
                    {view === 'dashboard' && (
                        <>
                            {/* Top Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg relative overflow-hidden flex flex-col justify-center">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-blue-500"></div>
                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Saldo Disponible</p>
                                    <h2 className={`text-3xl font-bold ${dashboardData.balance >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                                        ${dashboardData.balance.toLocaleString()}
                                    </h2>
                                </div>
                                {/* Interactive Cards */}
                                <div
                                    onClick={() => { setView('transactions'); setFilterType('income'); setFilterCategory(''); }}
                                    className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col justify-center cursor-pointer hover:bg-slate-750 transition-colors group"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-slate-400 text-xs font-medium uppercase group-hover:text-emerald-300">Ingresos</p>
                                        <div className="p-1 rounded bg-emerald-500/20 text-emerald-500"><TrendingUp size={16} /></div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-emerald-400">+${dashboardData.totalIncome.toLocaleString()}</h2>
                                </div>
                                <div
                                    onClick={() => { setView('transactions'); setFilterType('expense'); setFilterCategory(''); }}
                                    className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col justify-center cursor-pointer hover:bg-slate-750 transition-colors group"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-slate-400 text-xs font-medium uppercase group-hover:text-red-300">Egresos</p>
                                        <div className="p-1 rounded bg-red-500/20 text-red-500"><TrendingDown size={16} /></div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-red-400">-${dashboardData.totalExpense.toLocaleString()}</h2>
                                </div>
                                <div
                                    onClick={() => { setView('savings'); }}
                                    className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col justify-center cursor-pointer hover:bg-slate-750 transition-colors group"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-slate-400 text-xs font-medium uppercase group-hover:text-blue-300">Ahorro Total</p>
                                        <div className="p-1 rounded bg-blue-500/20 text-blue-500"><PiggyBank size={16} /></div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-blue-400">${dashboardData.totalSavings.toLocaleString()}</h2>
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        </>
                    )}

                    {/* --- TRANSACTIONS VIEW --- */}
                    {view === 'transactions' && (
                        <div className="space-y-4">
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleExportCSV}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                    title="Descargar CSV con los filtros actuales"
                                >
                                    <Download size={16} /> Exportar CSV
                                </button>
                                <button
                                    onClick={() => setIsTransferModalOpen(true)}
                                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                    <ArrowRightLeft size={16} /> Enviar a Ahorros
                                </button>
                            </div>
                            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                                    <h3 className="text-lg font-bold">Historial de Movimientos</h3>
                                    <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">{filteredTransactions.length} registros</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-400">
                                        <thead className="bg-slate-900/50 text-xs uppercase font-medium">
                                            <tr>
                                                <th className="px-6 py-4">Categoría / Fecha</th>
                                                <th className="px-6 py-4">Descripción / Método</th>
                                                <th className="px-6 py-4 text-right">Monto</th>
                                                <th className="px-6 py-4 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
    {filteredTransactions.length === 0 && (
        <tr>
            <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                No se encontraron movimientos.
            </td>
        </tr>
    )}
    {filteredTransactions.map((t) => {
        // 1. Lógica segura para iconos
        const categoryObj = categories.find(c => c.name === t.category);
        // Si es "Ahorro" o no encuentra la categoría, usa PiggyBank (Ahorro) o HelpCircle
        const IconToRender = categoryObj 
            ? (LucideIcons as any)[categoryObj.icon] 
            : (t.category === 'Ahorro' ? LucideIcons.PiggyBank : LucideIcons.HelpCircle);
            
        // 2. Formateo de Fecha (Ej: 18 DIC)
        const dateObj = new Date(t.date);
        // Corregimos zona horaria tomando la parte UTC o string directo
        const day = dateObj.getDate() || parseInt(t.date.split('-')[2]);
        const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
        const monthIndex = dateObj.getMonth(); 
        const month = monthNames[monthIndex] || monthNames[parseInt(t.date.split('-')[1]) - 1];

        // 3. Detectar si es Ahorro para color AZUL
        const isSavings = t.category === 'Ahorro';

        return (
        <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    {/* Fecha en Grande a la Izquierda */}
                    <div className="flex flex-col items-center justify-center bg-slate-800 p-2 rounded-lg border border-slate-700 min-w-[60px]">
                        <span className="text-xl font-bold text-white leading-none">{day}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{month}</span>
                    </div>

                    {/* Categoría Debajo (Pequeña) e Icono */}
                    <div className="flex flex-col">
                        <span className={`text-sm font-medium flex items-center gap-1 ${isSavings ? 'text-blue-400' : 'text-slate-200'}`}>
                            {t.description || 'Sin descripción'}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            {IconToRender && <IconToRender size={12} />}
                            {t.category}
                        </span>
                    </div>
                </div>
            </td>
            
            {/* Ocultamos descripción detallada aquí porque ya la pusimos arriba, o mostramos el método */}
            <td className="px-6 py-4 hidden md:table-cell">
                <div className="flex gap-2 text-xs text-slate-500">
                    <span className="bg-slate-800 px-2 py-1 rounded">{t.method === 'ocr' ? '📸 Auto' : t.method === 'voice' ? '🎙️ Voz' : 'Manual'}</span>
                    <span className="bg-slate-800 px-2 py-1 rounded">{t.paymentMethod === 'cash' ? '💵 Efectivo' : '🏦 Transf.'}</span>
                </div>
            </td>

            <td className={`px-6 py-4 text-right font-bold text-lg ${
                isSavings ? 'text-blue-400' : (t.type === 'income' ? 'text-emerald-400' : 'text-red-400')
            }`}>
                {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
            </td>

            <td className="px-6 py-4 text-center">
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => handleEditTransaction(t)}
                        className="text-slate-500 hover:text-blue-400 p-2 hover:bg-slate-800 rounded-full transition-all"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-800 rounded-full transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
        );
    })}
</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
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
                                            onClick={() => handleEditSavings(goal)}
                                            className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col gap-4 relative group cursor-pointer hover:border-slate-500 transition-all"
                                        >
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleDeleteSavings(goal.id, e)}
                                                    className="p-2 bg-slate-700 hover:bg-red-500/20 hover:text-red-500 rounded-full text-slate-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="flex justify-between items-start">
                                                <div className="p-3 rounded-xl bg-slate-700 text-white">
                                                    <DollarSign size={24} style={{ color: goal.color }} />
                                                </div>
                                                <span className="text-2xl font-bold text-white">${goal.currentAmount.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-200">{goal.name}</h4>
                                                <p className="text-xs text-slate-500">Meta: ${goal.targetAmount.toLocaleString()}</p>
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

                    {/* --- SETTINGS VIEW --- */}
                    {view === 'settings' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings size={20} /> Configuración del Perfil</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Nombre de Usuario</label>
                                        <input type="text" value={user.name} disabled className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white opacity-50 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                        <input type="text" value={user.email} disabled className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white opacity-50 cursor-not-allowed" />
                                    </div>

                                    {/* Profile Picture Upload */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-400 mb-2">Foto de Perfil</label>
                                        <div className="flex items-center gap-4">
                                            {settingsAvatar ? (
                                                <div className="relative group">
                                                    <img src={settingsAvatar} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-primary-500" />
                                                    <button
                                                        onClick={() => setSettingsAvatar('')}
                                                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12} className="text-white" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-500 text-slate-500">
                                                    <UserIcon size={24} />
                                                </div>
                                            )}

                                            <div className="flex-1 relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleAvatarUpload}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="bg-slate-900 border border-slate-600 hover:border-primary-500 hover:text-primary-500 transition-colors rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-slate-400 cursor-pointer">
                                                    <UploadCloud size={18} />
                                                    <span className="text-sm">Subir nueva imagen (Max 2MB)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Nueva Contraseña</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                            <input
                                                type="password"
                                                value={settingsNewPassword}
                                                onChange={(e) => setSettingsNewPassword(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white"
                                                placeholder="Dejar vacío para mantener"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LinkIcon size={20} /> Integraciones</h2>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Webhook de N8n</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={settingsN8nUrl}
                                            onChange={(e) => setSettingsN8nUrl(e.target.value)}
                                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="https://n8n.tu-dominio.com/webhook/..."
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Los nuevos movimientos se enviarán a esta URL automáticamente.</p>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveSettings}
                                    className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                                >
                                    <Save size={18} /> Guardar Cambios
                                </button>
                            </div>

                            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Wallet size={20} /> Gestión de Categorías</h2>

                                {/* Formulario de Creación */}
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-8">
                                    <h3 className="text-sm font-bold text-slate-300 mb-3">Agregar Nueva Categoría</h3>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <select
                                                value={newCategoryType}
                                                onChange={(e) => setNewCategoryType(e.target.value as 'expense' | 'income')}
                                                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                            >
                                                <option value="expense">Gastos</option>
                                                <option value="income">Ingresos</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="Ej: Comida Rápida"
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                            />
                                        </div>

                                        {/* Selector de Iconos */}
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1">Selecciona un icono:</p>
                                            <IconSelector selected={newCategoryIcon} onSelect={setNewCategoryIcon} />
                                        </div>

                                        <button onClick={handleAddCategory} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full md:w-auto self-end">
                                            Guardar Categoría
                                        </button>
                                    </div>
                                </div>

                                {/* Listas de Categorías */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-red-400 font-bold mb-3 border-b border-slate-700 pb-2">Categorías de Gastos</h3>
                                        <ul className="space-y-2">
                                            {expenseCategories.map(cat => {
                                                const Icon = (LucideIcons as any)[cat.icon] || LucideIcons.Circle;
                                                return (
                                                    <li key={cat.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg group">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500"><Icon size={16} /></span>
                                                            <span>{cat.name}</span>
                                                        </div>
                                                        {!cat.isDefault && (
                                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="text-emerald-400 font-bold mb-3 border-b border-slate-700 pb-2">Categorías de Ingresos</h3>
                                        <ul className="space-y-2">
                                            {incomeCategories.map(cat => {
                                                const Icon = (LucideIcons as any)[cat.icon] || LucideIcons.Circle;
                                                return (
                                                    <li key={cat.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg group">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500"><Icon size={16} /></span>
                                                            <span>{cat.name}</span>
                                                        </div>
                                                        {!cat.isDefault && (
                                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {view !== 'savings' && view !== 'settings' && (
                    <button
                        onClick={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }}
                        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 bg-primary-600 hover:bg-primary-500 text-white w-14 h-14 lg:w-16 lg:h-16 rounded-full shadow-2xl shadow-primary-500/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
                    >
                        <Plus size={32} />
                    </button>
                )}

                {/* Modals */}
                <TransactionModal isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }} onSave={handleSaveTransaction} initialData={editingTransaction} expenseCategories={expenseCategories} incomeCategories={incomeCategories} />
                <SavingsModal isOpen={isSavingsModalOpen} onClose={() => { setIsSavingsModalOpen(false); setEditingSavings(null); }} onSave={handleSaveSavings} initialData={editingSavings} />
                <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} savingsGoals={savings} onTransfer={handleTransferToSavings} />

            </main>

            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>}

        </div>
    );
}

export default App;