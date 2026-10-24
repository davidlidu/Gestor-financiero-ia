import React, { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Sparkles, Loader2, X, ChevronDown } from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { StorageService } from '../services/storageService';
import { formatMoney } from '../utils/format';

interface Props {
  month: string;              // mes al que se aplican los presupuestos (YYYY-MM)
  transactions: Transaction[];
  categories: Category[];     // categorías de gasto
  existing: Budget[];         // presupuestos que ya tiene ese mes
  onApplied: (budgets: Budget[]) => void;
  onClose: () => void;
}

type Kind = 'fijo' | 'variable' | 'ocasional';

interface Row {
  category: Category;
  kind: Kind;
  suggested: number;
  monthsWithSpend: number;
  min: number;
  max: number;
  existing?: number;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// Nombres que suelen ser gastos fijos aunque el monto varíe un poco (servicios, gasolina, arriendo…)
const FIXED_HINT = /(servicio|internet|telefon|celular|datos|arriendo|vivienda|hogar|seguro|suscrip|educaci|colegio|universidad|tarjeta|credito|prestamo|deuda|cuota|gasolina|combustible|mercado|alimentaci|administraci|gimnasio)/;

const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
// Redondeo hacia arriba a un valor "limpio": de a 5.000 bajo 100.000, de a 10.000 por encima
const roundUp = (n: number) => {
  const step = n < 100000 ? 5000 : 10000;
  return Math.ceil(n / step) * step;
};

const KIND_INFO: Record<Kind, { title: string; desc: string; badge: string }> = {
  fijo: { title: 'Gastos fijos', desc: 'Aparecen casi todos los meses con un valor parecido. Sugerencia: la mediana de tu historial.', badge: 'bg-sky-500/15 text-sky-400' },
  variable: { title: 'Variables recurrentes', desc: 'Aparecen seguido pero el valor cambia (entretenimiento, parqueaderos, peajes…). Sugerencia: tu promedio mensual.', badge: 'bg-amber-500/15 text-amber-400' },
  ocasional: { title: 'Ocasionales', desc: 'Pocas veces en el periodo. Desmarcados por defecto.', badge: 'bg-slate-600/40 text-slate-400' },
};

export const BudgetSuggestions: React.FC<Props> = ({ month, transactions, categories, existing, onApplied, onClose }) => {
  const [span, setSpan] = useState<3 | 6>(6);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [showOccasional, setShowOccasional] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const analysis = useMemo(() => {
    // Meses completos anteriores al mes elegido que tengan algún gasto (no se penaliza a quien empezó a usar la app hace poco)
    const window = Array.from({ length: span }, (_, i) => shiftMonth(month, -(i + 1)));
    const expenses = transactions.filter(t => t.type === 'expense' && t.category !== 'Ahorro');
    const months = window.filter(m => expenses.some(t => t.date.startsWith(m)));
    const byCat = new Map<string, Map<string, number>>();
    expenses.forEach(t => {
      const m = t.date.substring(0, 7);
      if (!months.includes(m)) return;
      const k = norm(t.category || '');
      const per = byCat.get(k) || new Map<string, number>();
      per.set(m, (per.get(m) || 0) + t.amount);
      byCat.set(k, per);
    });

    const rows: Row[] = [];
    const orphan: string[] = [];
    byCat.forEach((per, k) => {
      const category = categories.find(c => norm(c.name) === k);
      if (!category) { orphan.push(k); return; }
      const present = months.map(m => per.get(m) || 0).filter(v => v > 0);
      const presence = present.length / months.length;
      const mean = present.reduce((a, v) => a + v, 0) / present.length;
      const cv = present.length > 1 ? Math.sqrt(present.reduce((a, v) => a + (v - mean) ** 2, 0) / present.length) / mean : 0;
      const hint = FIXED_HINT.test(k);
      let kind: Kind;
      if ((presence >= 0.8 && cv <= 0.3) || (hint && presence >= 0.6)) kind = 'fijo';
      else if (presence >= 0.5) kind = 'variable';
      else kind = 'ocasional';
      const base = kind === 'fijo' ? median(present) : months.reduce((a, m) => a + (per.get(m) || 0), 0) / months.length;
      const ex = existing.find(b => String(b.categoryId) === String(category.id));
      rows.push({ category, kind, suggested: roundUp(base), monthsWithSpend: present.length, min: Math.min(...present), max: Math.max(...present), existing: ex?.amount });
    });
    rows.sort((a, b) => b.suggested - a.suggested);
    return { months, rows, orphan };
  }, [span, month, transactions, categories, existing]);

  const idOf = (r: Row) => String(r.category.id);
  // Por defecto: fijos y variables sin presupuesto previo
  const isSelected = (r: Row) => selected[idOf(r)] ?? (r.kind !== 'ocasional' && r.existing === undefined);
  const amountOf = (r: Row) => amounts[idOf(r)] ?? r.suggested;
  const chosen = analysis.rows.filter(isSelected);
  const total = chosen.reduce((a, r) => a + amountOf(r), 0);

  const apply = async () => {
    const overwrite = chosen.filter(r => r.existing !== undefined);
    if (overwrite.length && !confirm(`${overwrite.length} categoría(s) ya tienen presupuesto este mes y se reemplazará su monto. ¿Continuar?`)) return;
    setApplying(true); setError('');
    try {
      let latest: Budget[] = existing;
      for (const r of chosen) {
        latest = await StorageService.saveBudget({ id: '', categoryId: idOf(r), categoryName: r.category.name, amount: amountOf(r), monthYear: month });
      }
      onApplied(latest);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron guardar los presupuestos.');
    } finally {
      setApplying(false);
    }
  };

  const renderRow = (r: Row) => {
    const Icon = (LucideIcons as any)[r.category.icon] || LucideIcons.Circle;
    const id = idOf(r);
    return (
      <div key={id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 py-2 border-b border-slate-200 dark:border-slate-700/60 last:border-0">
        <input type="checkbox" checked={isSelected(r)} onChange={e => setSelected(s => ({ ...s, [id]: e.target.checked }))} className="w-4 h-4 accent-emerald-500 shrink-0" aria-label={`Usar sugerencia para ${r.category.name}`} />
        <span className="text-slate-500 shrink-0"><Icon size={16} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.category.name}</p>
          <p className="text-[11px] text-slate-500 break-words">
            {r.monthsWithSpend} de {analysis.months.length} meses · ${formatMoney(r.min)}{r.max !== r.min ? ` – $${formatMoney(r.max)}` : ''}
            {r.existing !== undefined && <span className="text-amber-500"> · ya tiene ${formatMoney(r.existing)}</span>}
          </p>
        </div>
        <div className="relative w-full sm:w-32 shrink-0 pl-14 sm:pl-0">
          <span className="absolute left-16 sm:left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
          <input
            type="number"
            value={amountOf(r)}
            onChange={e => setAmounts(a => ({ ...a, [id]: Number(e.target.value) || 0 }))}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-5 pr-2 py-1.5 text-sm text-slate-800 dark:text-white text-right"
            aria-label={`Monto sugerido para ${r.category.name}`}
          />
        </div>
      </div>
    );
  };

  const section = (kind: Kind) => {
    const rows = analysis.rows.filter(r => r.kind === kind);
    if (rows.length === 0) return null;
    const info = KIND_INFO[kind];
    const collapsed = kind === 'ocasional' && !showOccasional;
    return (
      <div className="mb-4">
        <button type="button" onClick={() => kind === 'ocasional' && setShowOccasional(v => !v)} className="w-full text-left">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${info.badge}`}>{rows.length}</span> {info.title}
            {kind === 'ocasional' && <ChevronDown size={14} className={`transition-transform ${showOccasional ? 'rotate-180' : ''}`} />}
          </p>
          <p className="text-[11px] text-slate-500 mb-1">{info.desc}</p>
        </button>
        {!collapsed && rows.map(renderRow)}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><Sparkles size={15} className="text-brand-500" /> Presupuestos sugeridos según tus gastos</h4>
          <p className="text-[11px] text-slate-500">
            {analysis.months.length > 0
              ? `Analicé ${analysis.months.length} mes${analysis.months.length === 1 ? '' : 'es'} con movimientos antes de este.`
              : 'No hay meses anteriores con gastos para analizar.'}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
            {([3, 6] as const).map(n => (
              <button key={n} onClick={() => setSpan(n)} className={`px-2.5 py-1 rounded-md ${span === n ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold' : 'text-slate-500'}`}>
                {n} meses
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Cerrar sugerencias"><X size={16} /></button>
        </div>
      </div>

      {analysis.months.length < 2 ? (
        <p className="text-sm text-slate-500">Necesito al menos 2 meses con gastos registrados para sugerir presupuestos confiables.</p>
      ) : (
        <>
          {section('fijo')}
          {section('variable')}
          {section('ocasional')}
          {analysis.orphan.length > 0 && (
            <p className="text-[11px] text-slate-500 mb-3">Sin sugerencia porque la categoría ya no existe: {analysis.orphan.join(', ')}.</p>
          )}
          {error && <p className="text-sm text-danger-500 mb-2">{error}</p>}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">{chosen.length} seleccionados · total <b>${formatMoney(total)}</b></p>
            <button
              onClick={apply}
              disabled={applying || chosen.length === 0}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {applying && <Loader2 size={15} className="animate-spin" />} Aplicar {chosen.length} presupuesto{chosen.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
