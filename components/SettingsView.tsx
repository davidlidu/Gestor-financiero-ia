import React, { useState, useEffect } from 'react';
import { Settings, Save, Link as LinkIcon, Wallet, Trash2, X, User as UserIcon, UploadCloud, Lock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { IconSelector } from './IconSelector';
import { UserProfile, Category } from '../types';
import { StorageService } from '../services/storageService';

interface SettingsViewProps {
    user: UserProfile;
    onUpdateUser: (updatedUser: UserProfile) => void;
    categories: Category[];
    onUpdateCategories: (newCategories: Category[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser, categories, onUpdateCategories }) => {
    // --- Local Profile State ---
    const [avatar, setAvatar] = useState(user.avatar || '');
    const [newPassword, setNewPassword] = useState('');
    const [n8nUrl, setN8nUrl] = useState(user.n8nUrl || '');

    // --- Local Category Form State ---
    const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Circle');

    useEffect(() => {
        setAvatar(user.avatar || '');
        setN8nUrl(user.n8nUrl || '');
    }, [user]);

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    // --- Methods ---
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
                setAvatar(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSettings = () => {
        const updatedUser = {
            ...user,
            n8nUrl,
            avatar,
            password: newPassword ? newPassword : user.password
        };
        StorageService.saveUser(updatedUser);

        // Also update local DB
        const users = JSON.parse(localStorage.getItem('lidutech_db_users') || '[]');
        const index = users.findIndex((u: any) => u.id === user.id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updatedUser };
            localStorage.setItem('lidutech_db_users', JSON.stringify(users));
        }

        onUpdateUser(updatedUser);
        setNewPassword('');
        alert('Configuración guardada correctamente.');
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const newCat = await StorageService.createCategory({
                name: newCategoryName,
                icon: newCategoryIcon,
                type: newCategoryType
            });
            onUpdateCategories([...categories, newCat]);
            setNewCategoryName('');
            setNewCategoryIcon('Circle');
        } catch (error) {
            console.error("Error al crear categoría:", error);
            alert("Error al intentar guardar la categoría.");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta categoría? Si tiene movimientos, quedarán sin categoría.')) {
            try {
                await StorageService.deleteCategory(id);
                onUpdateCategories(categories.filter(c => c.id !== id));
            } catch (error) {
                console.error("Error al eliminar categoría:", error);
                alert("Error al intentar eliminar la categoría.");
            }
        }
    };

    return (
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
                            {avatar ? (
                                <div className="relative group">
                                    <img src={avatar} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-primary-500" />
                                    <button
                                        onClick={() => setAvatar('')}
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
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
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
                            value={n8nUrl}
                            onChange={(e) => setN8nUrl(e.target.value)}
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
    );
};
