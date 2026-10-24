import React, { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { GitMerge, Loader2, Sparkles, X } from 'lucide-react';
import { Category, Transaction } from '../types';
import { StorageService } from '../services/storageService';

interface Props {
  categories: Category[];
  transactions: Transaction[];
  onChanged: () => void; // recargar categorías y movimientos tras unir
}

// Sin tildes, minúsculas, sin puntuación ni sufijos legales ("S.A.S", "Ltda")
const key = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[.,/()\-_*]/g, ' ')
    .replace(/\b(s ?a ?s|ltda|s ?a|inc|llc)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();

// Grupos de nombres que suelen ser la misma categoría
const SYNONYMS: string[][] = [
  ['vivienda', 'hogar', 'arriendo', 'casa', 'alquiler', 'renta'],
  ['alimentacion', 'mercado', 'supermercado', 'comida', 'viveres'],
  ['comida x fuera', 'comida fuera', 'comidas fuera', 'restaurantes', 'restaurante', 'restaurantes y domicilios', 'domicilios'],
  ['gasolina', 'combustible'],
  ['carro', 'vehiculo', 'auto', 'mantenimiento vehiculo', 'mantenimiento carro'],
  ['parqueadero', 'parqueaderos', 'peaje', 'peajes', 'parqueaderos y peajes', 'peaje parking'],
  ['prestamo', 'prestamos', 'credito', 'creditos', 'deudas', 'deudas y creditos'],
  ['tarjeta de credito', 'tarjeta credito', 'tarjetas', 'tarjetas de credito'],
  ['internet', 'datos celular', 'celular', 'telefonia', 'internet y telefonia', 'plan celular', 'telefono'],
  ['mascotas', 'mascota', 'veterinario', 'veterinaria'],
  ['servicios', 'servicios publicos'],
  ['salud', 'medicamentos', 'drogueria', 'medico'],
  ['suscripciones', 'suscripcion', 'streaming'],
  ['entretenimiento', 'ocio', 'diversion'],
  ['otros', 'otro', 'varios'],
];
const SYN_INDEX = new Map<string, number>();
SYNONYMS.forEach((g, i) => g.forEach(n => SYN_INDEX.set(n, i)));
const PET_ICONS = new Set(['Cat', 'Dog', 'PawPrint', 'Fish', 'Bird', 'Rabbit']);

const isDefault = (c: Category) => !!(c.isDefault ?? (c as any).is_default);
const Icon: React.FC<{ name: string }> = ({ name }) => {
  const C = (LucideIcons as any)[name] || LucideIcons.Circle;
  return <C size={14} />;
};

const DISMISS_KEY = 'lidutech_dismissed_merges';
const readDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; } };

export const CategoryReview: React.FC<Props> = ({ categories, transactions, onChanged }) => {
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Unión manual
  const [manualType, setManualType] = useState<'expense' | 'income'>('expense');
  const [manualSel, setManualSel] = useState<string[]>([]);
  const [manualTarget, setManualTarget] = useState('');

  // Movimientos por categoría (mismo criterio que el servidor: nombre normalizado + tipo)
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    transactions.forEach(t => {
      const k = t.type + '|' + key(t.category || '');
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [transactions]);
  const countOf = (c: Category) => usage.get(c.type + '|' + key(c.name)) || 0;

  // Sugerencias: union-find sobre nombres iguales, sinónimos, prefijos ("Ivory" / "Ivory Agencia") e iconos de mascota
  const suggestions = useMemo(() => {
    const groups: Category[][] = [];
    (['expense', 'income'] as const).forEach(type => {
      const cats = categories.filter(c => c.type === type);
      const parent = cats.map((_, i) => i);
      const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      const join = (a: number, b: number) => { parent[find(a)] = find(b); };
      for (let i = 0; i < cats.length; i++) {
        for (let j = i + 1; j < cats.length; j++) {
          const a = key(cats[i].name), b = key(cats[j].name);
          const sa = SYN_INDEX.get(a), sb = SYN_INDEX.get(b);
          // Prefijo solo en ingresos (clientes: "Ivory" / "Ivory Agencia"); en gastos uniría cosas distintas ("Comida" / "Comida x fuera")
          const prefix = (x: string, y: string) => type === 'income' && x.length >= 4 && y.startsWith(x + ' ');
          const tarjeta = a.startsWith('tarjeta de credito') && b.startsWith('tarjeta de credito');
          const pets = type === 'expense' &&
            (PET_ICONS.has(cats[i].icon) || SYN_INDEX.get(a) === SYN_INDEX.get('mascotas')) &&
            (PET_ICONS.has(cats[j].icon) || SYN_INDEX.get(b) === SYN_INDEX.get('mascotas'));
          if (a === b || (sa !== undefined && sa === sb) || prefix(a, b) || prefix(b, a) || tarjeta || pets) join(i, j);
        }
      }
      const byRoot = new Map<number, Category[]>();
      cats.forEach((c, i) => { const r = find(i); byRoot.set(r, [...(byRoot.get(r) || []), c]); });
      byRoot.forEach(g => { if (g.length > 1) groups.push(g); });
    });
    return groups
      .map(g => {
        const sorted = [...g].sort((a, b) => countOf(b) - countOf(a) || Number(isDefault(b)) - Number(isDefault(a)) || a.name.length - b.name.length);
        return { id: sorted.map(c => c.id).sort().join('-'), cats: sorted };
      })
      .filter(s => !dismissed.includes(s.id));
  }, [categories, usage, dismissed]);

  const merge = async (groupId: string, sources: Category[], target: Category) => {
    const moved = sources.reduce((a, c) => a + countOf(c), 0);
    const names = sources.map(c => `"${c.name.trim()}"`).join(', ');
    if (!confirm(`Unir ${names} en "${target.name.trim()}".\n\nSe moverán ${moved} movimiento${moved === 1 ? '' : 's'} y sus presupuestos. Las categorías de origen dejarán de aparecer. ¿Continuar?`)) return;
    setBusy(groupId); setError(''); setMessage('');
    try {
      const r = await StorageService.mergeCategories(sources.map(c => String(c.id)), String(target.id));
      setMessage(`Listo: ${r.movedTransactions} movimientos y ${r.movedBudgets} presupuestos ahora están en "${target.name.trim()}".`);
      setManualSel([]); setManualTarget('');
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'No se pudo unir las categorías.');
    } finally {
      setBusy(null);
    }
  };

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  };

  const manualCats = categories.filter(c => c.type === manualType);
  const chip = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border';

  return (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-8 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><Sparkles size={15} className="text-primary-400" /> Revisar y unir categorías</h3>
        <p className="text-xs text-slate-500 mt-1">
          Detecto categorías repetidas o que significan lo mismo. Al unirlas, sus movimientos y presupuestos pasan a la que elijas.
          Las categorías comunes (internet, gasolina, parqueaderos y peajes, suscripciones, seguros, mascotas…) ya están disponibles para todos.
        </p>
      </div>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {suggestions.length === 0 ? (
        <p className="text-sm text-slate-500">No encontré categorías repetidas. 👌</p>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => {
            const targetId = targets[s.id] || String(s.cats[0].id);
            const target = s.cats.find(c => String(c.id) === targetId) || s.cats[0];
            const sources = s.cats.filter(c => c !== target);
            return (
              <div key={s.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-slate-400 mb-2">
                    {s.cats[0].type === 'expense' ? 'Gastos' : 'Ingresos'} · Elige con cuál quedarte:
                  </p>
                  <button onClick={() => dismiss(s.id)} className="text-slate-500 hover:text-white" title="No son la misma" aria-label="Descartar sugerencia"><X size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.cats.map(c => {
                    const selected = c === target;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setTargets(t => ({ ...t, [s.id]: String(c.id) }))}
                        className={`${chip} ${selected ? 'bg-primary-600/20 border-primary-500 text-white' : 'border-slate-600 text-slate-300 hover:border-slate-500'}`}
                      >
                        <Icon name={c.icon} /> {c.name.trim()} <span className="text-slate-500">({countOf(c)})</span>
                        {isDefault(c) && <span className="text-[9px] text-slate-500 uppercase">sistema</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => merge(s.id, sources, target)}
                  disabled={busy !== null}
                  className="mt-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  {busy === s.id ? <Loader2 size={13} className="animate-spin" /> : <GitMerge size={13} />}
                  Unir {sources.length} en "{target.name.trim()}"
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Unión manual */}
      <details className="rounded-lg border border-slate-700 p-3">
        <summary className="text-xs font-semibold text-slate-300 cursor-pointer">Unir categorías manualmente</summary>
        <div className="mt-3 space-y-3">
          <select
            value={manualType}
            onChange={e => { setManualType(e.target.value as any); setManualSel([]); setManualTarget(''); }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
          </select>
          <p className="text-[11px] text-slate-500">1. Marca las categorías a unir · 2. Elige la que se queda (★)</p>
          <div className="flex flex-wrap gap-2">
            {manualCats.map(c => {
              const id = String(c.id);
              const sel = manualSel.includes(id);
              const isTarget = manualTarget === id;
              return (
                <span key={id} className={`${chip} ${isTarget ? 'border-primary-500 bg-primary-600/20 text-white' : sel ? 'border-amber-500/60 text-white' : 'border-slate-600 text-slate-300'}`}>
                  <input type="checkbox" checked={sel} onChange={() => setManualSel(p => sel ? p.filter(x => x !== id) : [...p, id])} className="accent-emerald-500" aria-label={`Seleccionar ${c.name}`} />
                  <Icon name={c.icon} /> {c.name.trim()} <span className="text-slate-500">({countOf(c)})</span>
                  {sel && (
                    <button type="button" onClick={() => setManualTarget(id)} className={isTarget ? 'text-primary-400' : 'text-slate-500 hover:text-white'} title="Quedarse con esta">★</button>
                  )}
                </span>
              );
            })}
          </div>
          <button
            onClick={() => {
              const target = manualCats.find(c => String(c.id) === manualTarget);
              const sources = manualCats.filter(c => manualSel.includes(String(c.id)) && String(c.id) !== manualTarget);
              if (target && sources.length) merge('manual', sources, target);
            }}
            disabled={busy !== null || !manualTarget || manualSel.filter(x => x !== manualTarget).length === 0}
            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            {busy === 'manual' ? <Loader2 size={13} className="animate-spin" /> : <GitMerge size={13} />} Unir seleccionadas
          </button>
        </div>
      </details>
    </div>
  );
};
