import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  PiggyBank,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  onLogout: () => void;
  currentView: 'dashboard' | 'transactions' | 'savings' | 'reports' | 'installments' | 'settings';
  onNavigate: (view: 'dashboard' | 'transactions' | 'savings' | 'reports' | 'installments' | 'settings') => void;
}

export function Layout({ children, user, onLogout, currentView, onNavigate }: LayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimientos', icon: ArrowRightLeft },
    { id: 'savings', label: 'Metas', icon: PiggyBank },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'installments', label: 'Cuotas', icon: CreditCard },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ] as const;

  // Desktop sidebar nav links
  const DesktopNavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
              ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 font-medium'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <Icon size={20} className={isActive ? 'text-brand-500' : ''} />
            {item.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 transition-colors duration-300 flex">
      {/* ============ DESKTOP SIDEBAR ============ */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 fixed h-full z-20">
        {/* Brand */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
            DS
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-800 dark:text-white leading-tight">DeerSystems</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Financial IA</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          <DesktopNavLinks />
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.name || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-1 flex justify-center"
              title="Alternar Tema"
              aria-label="Alternar tema oscuro/claro"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-lg transition-colors flex-1 flex justify-center"
              title="Cerrar Sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============ MOBILE HEADER ============ */}
      <header className="md:hidden fixed top-0 w-full h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
            DS
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-800 dark:text-white leading-tight">DeerSystems</span>
            <span className="text-[8px] font-medium text-slate-400 uppercase tracking-widest -mt-0.5">Financial IA</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-500 rounded-lg"
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-danger-500 rounded-lg"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 z-30 safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-lg transition-all duration-200 min-w-0 flex-1 ${isActive
                  ? 'text-emerald-500'
                  : 'text-slate-400 active:text-slate-200'
                  }`}
                aria-label={item.label}
              >
                <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-emerald-500/10' : ''
                  }`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[9px] font-medium transition-all leading-tight ${isActive ? 'text-emerald-500 font-semibold' : 'text-slate-400'
                  }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ============ MAIN CONTENT ============ */}
      <main className="flex-1 md:ml-64 pt-14 pb-20 md:pt-0 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
