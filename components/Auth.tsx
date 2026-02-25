import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { AuthState } from '../types';

interface AuthProps {
    authView: AuthState;
    setAuthView: React.Dispatch<React.SetStateAction<AuthState>>;
    handleLogin: (e: React.FormEvent) => Promise<void>;
    handleRegister: (e: React.FormEvent) => Promise<void>;
    handleVerify2FA: (e: React.FormEvent) => Promise<void>;

    emailInput: string;
    setEmailInput: (val: string) => void;
    passwordInput: string;
    setPasswordInput: (val: string) => void;
    nameInput: string;
    setNameInput: (val: string) => void;
    otpInput: string;
    setOtpInput: (val: string) => void;
    rememberMe: boolean;
    setRememberMe: (val: boolean) => void;
}

export function Auth({
    authView, setAuthView,
    handleLogin, handleRegister, handleVerify2FA,
    emailInput, setEmailInput,
    passwordInput, setPasswordInput,
    nameInput, setNameInput,
    otpInput, setOtpInput,
    rememberMe, setRememberMe
}: AuthProps) {

    const switchToRegister = () => { setAuthView({ view: 'register', email: '' }); setPasswordInput(''); setNameInput(''); };
    const switchToLogin = () => { setAuthView({ view: 'login', email: '' }); setPasswordInput(''); };

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>
                <div className="absolute top-40 right-10 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-glass dark:shadow-glass-dark border border-slate-200 dark:border-slate-700 z-10 transition-colors">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-white font-bold text-2xl">DS</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">DeerSystems</h1>
                    <p className="text-xs font-medium text-emerald-500 uppercase tracking-widest mb-3">Financial IA</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {authView.view === 'login' && 'Tu dinero, más inteligente'}
                        {authView.view === 'register' && 'Crea tu cuenta segura'}
                        {authView.view === 'verify_2fa' && 'Verificación de Seguridad'}
                    </p>
                </div>

                {authView.view === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25 mt-4 hover:shadow-brand-500/40 transform hover:-translate-y-0.5">
                            Iniciar Sesión
                        </button>
                        <div className="text-center mt-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                ¿No tienes cuenta? <button type="button" onClick={switchToRegister} className="text-brand-600 dark:text-brand-400 font-medium hover:underline transition-all">Regístrate aquí</button>
                            </p>
                        </div>
                    </form>
                )}

                {authView.view === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre Completo</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3.5 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25 mt-4 hover:shadow-brand-500/40 transform hover:-translate-y-0.5">
                            Crear Cuenta
                        </button>
                        <div className="text-center mt-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                ¿Ya tienes cuenta? <button type="button" onClick={switchToLogin} className="text-brand-600 dark:text-brand-400 font-medium hover:underline transition-all">Inicia sesión</button>
                            </p>
                        </div>
                    </form>
                )}

                {authView.view === 'verify_2fa' && (
                    <form onSubmit={handleVerify2FA} className="space-y-4">
                        <div className="text-center bg-brand-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-brand-100 dark:border-slate-700 mb-6">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200 dark:border-slate-700">
                                <ShieldCheck size={24} className="text-brand-500" />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Código enviado a:</p>
                            <p className="text-slate-900 dark:text-white font-medium">{authView.email}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">Ingresa el código de 6 dígitos</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                value={otpInput}
                                onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-mono transition-all"
                                placeholder="000000"
                            />
                        </div>

                        <div className="flex items-center gap-3 py-3 justify-center">
                            <input
                                type="checkbox"
                                id="rememberDevice"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-900"
                            />
                            <label htmlFor="rememberDevice" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                Recordar este dispositivo
                            </label>
                        </div>

                        <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25 mt-2 hover:shadow-brand-500/40 transform hover:-translate-y-0.5">
                            Verificar Acceso
                        </button>

                        <button type="button" onClick={switchToLogin} className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mt-4 font-medium transition-colors">
                            Cancelar y volver
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
