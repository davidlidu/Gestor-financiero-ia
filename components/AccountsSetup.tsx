import React, { useState } from 'react';
import { Landmark, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { AccountAlias, Category } from '../types';
import { StorageService } from '../services/storageService';

interface Props {
  accounts: AccountAlias[];
  onChange: (accounts: AccountAlias[]) => void;
  categories: Category[];
}

const EMPTY = { accountNumber: '', label: '', isOwn: false, category: '' };

// Cuentas propias y de terceros: el sistema las reconoce en los movimientos, el atajo y la importación de Gmail
export const AccountsSetup: React.FC<Props> = ({ accounts, onChange, categories }) => {
  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const expenseCats = categories.filter(c => c.type === 'expense');
  const incomeCats = categories.filter(c => c.type === 'income');

  const startEdit = (a: AccountAlias) => {
    setForm({ id: a.id, accountNumber: a.accountNumber, label: a.label, isOwn: a.isOwn, category: a.category || '' });
    setError(''); setOpen(true);
  };
  const cancel = () => { setForm(EMPTY); setOpen(false); setError(''); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const saved = await StorageService.saveAccount({ ...form, category: form.category || null });
      onChange(form.id ? accounts.map(a => (a.id === saved.id ? saved : a)) : [...accounts, saved]);
      cancel();
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: AccountAlias) => {
    if (!confirm(`¿Eliminar la cuenta de ${a.label}?`)) return;
    try { await StorageService.deleteAccount(a.id); onChange(accounts.filter(x => x.id !== a.id)); }
    catch (e: any) { setError(e?.message || 'No se pudo eliminar.'); }
  };

  const digits = form.accountNumber.replace(/\D/g, '');

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-xl font-bold flex items-center gap-2"><Landmark size={20} className="text-primary-500" /> Cuentas conocidas</h2>
        {!open && (
          <button onClick={() => { setForm(EMPTY); setOpen(true); }} className="bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Plus size={15} /> Agregar cuenta
          </button>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Registra tus cuentas y las de las personas a quienes les envías o de quienes recibes plata. En los movimientos verás a quién pertenece cada número
        (por ejemplo <i>"a cuenta *6485 (Roxana)"</i>), y el atajo y la importación de Gmail lo anotan solos.
      </p>

      {open && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Número de cuenta, tarjeta o llave</label>
              <input
                value={form.accountNumber}
                onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                inputMode="numeric"
                placeholder="Ej: 29200006485 o los últimos 4: 6485"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">Basta con los últimos 4 dígitos; con el número completo el reconocimiento es más preciso.</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">¿A quién pertenece?</label>
              <input
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder="Ej: Roxana Gómez, Arrendador, Mi ahorros Bancolombia"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.isOwn} onChange={e => setForm({ ...form, isOwn: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
              Es una cuenta mía
            </label>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Categoría al detectarla (opcional)</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                disabled={form.isOwn}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="">Que la decida la IA</option>
                <optgroup label="Gastos">{expenseCats.map(c => <option key={c.id} value={c.name}>{c.name.trim()}</option>)}</optgroup>
                <optgroup label="Ingresos">{incomeCats.map(c => <option key={'i' + c.id} value={c.name}>{c.name.trim()}</option>)}</optgroup>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={cancel} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg">Cancelar</button>
            <button onClick={save} disabled={saving || digits.length < 4 || !form.label.trim()} className="px-4 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg disabled:opacity-40 flex items-center gap-1.5">
              {saving && <Loader2 size={14} className="animate-spin" />} {form.id ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        !open && <p className="text-sm text-slate-500">Aún no tienes cuentas registradas.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map(a => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-3 bg-slate-900 rounded-lg">
              <div className="min-w-0">
                <p className="text-sm text-slate-200 truncate">
                  {a.label} {a.isOwn && <span className="text-[10px] uppercase text-emerald-400 ml-1">mía</span>}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {a.accountNumber.length > 4 ? `•••${a.accountNumber.slice(-4)} (${a.accountNumber})` : `•••${a.accountNumber}`}
                  {a.category ? ` · ${a.category}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(a)} className="text-slate-500 hover:text-primary-400" aria-label={`Editar cuenta de ${a.label}`}><Pencil size={15} /></button>
                <button onClick={() => remove(a)} className="text-slate-600 hover:text-red-500" aria-label={`Eliminar cuenta de ${a.label}`}><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
