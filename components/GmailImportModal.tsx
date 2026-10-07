import React, { useMemo, useState } from 'react';
import { X, Search, Loader2, Download, CheckCircle2, Mail, AlertTriangle, CopyCheck, FilePlus2 } from 'lucide-react';
import { Category, Transaction } from '../types';
import { GoogleService, ImportCandidate } from '../services/googleService';
import { formatMoney } from '../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenseCategories: Category[];
  incomeCategories: Category[];
  // Movimientos que ya existen en el sistema, para compararlos con lo que se va a importar
  transactions: Transaction[];
  onImported: () => void;
}

type Row = ImportCandidate & { selected: boolean };
type Filter = 'all' | 'new' | 'dup';

// Días de diferencia tolerados entre la fecha del correo y la del movimiento ya registrado
const DATE_TOLERANCE_DAYS = 3;

const DAY_MS = 86400000;
const toDay = (s: string) => Date.parse(s.substring(0, 10) + 'T00:00:00Z');

// Movimientos existentes que podrían ser el mismo que el candidato: mismo tipo y monto,
// fecha cercana. El nombre/descripción se ignora a propósito (el banco lo escribe distinto).
const findMatches = (c: ImportCandidate, txs: Transaction[]) =>
  txs
    .filter(t => t.type === c.type && Math.round(t.amount) === Math.round(c.amount))
    .map(t => ({ t, diff: Math.round((toDay(t.date) - toDay(c.date)) / DAY_MS) }))
    .filter(m => Math.abs(m.diff) <= DATE_TOLERANCE_DAYS)
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
    .slice(0, 3);

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};
const today = () => daysAgo(0);

const fmtDate = (s: string) => {
  const [y, m, d] = s.substring(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const GmailImportModal: React.FC<Props> = ({ isOpen, onClose, expenseCategories, incomeCategories, transactions, onImported }) => {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [scanned, setScanned] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  // Coincidencias recalculadas al editar monto, tipo o fecha de cada fila
  const matches = useMemo(() => rows.map(r => findMatches(r, transactions)), [rows, transactions]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true); setError(''); setResult(null); setRows([]); setScanned(null); setFilter('all');
    try {
      const { candidates, scanned } = await GoogleService.preview(from, to);
      setScanned(scanned);
      // Lo que ya parece existir (o ya se importó) llega desmarcado: se decide a mano
      setRows(candidates.map(c => ({ ...c, selected: !c.alreadyImported && findMatches(c, transactions).length === 0 })));
    } catch (e: any) {
      setError(e.message || 'Error al analizar los correos.');
    } finally {
      setLoading(false);
    }
  };

  const update = (i: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const isDup = (i: number) => rows[i].alreadyImported || matches[i].length > 0;
  const counts = {
    all: rows.length,
    dup: rows.filter((_, i) => isDup(i)).length,
    new: rows.filter((_, i) => !isDup(i)).length,
  };
  const selectedCount = rows.filter(r => r.selected && !r.alreadyImported).length;

  const handleImport = async () => {
    const items = rows.filter(r => r.selected && !r.alreadyImported);
    if (items.length === 0) return;
    setImporting(true); setError('');
    try {
      const res = await GoogleService.confirm(items);
      setResult(res);
      setRows(prev => prev.map(r => (r.selected && !r.alreadyImported) ? { ...r, alreadyImported: true, selected: false } : r));
      onImported();
    } catch (e: any) {
      setError(e.message || 'Error al importar.');
    } finally {
      setImporting(false);
    }
  };

  const inputCls = 'bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-primary-500 min-w-0';
  const chip = (id: Filter, label: string) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === id ? 'bg-primary-600 text-white border-primary-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}`}
    >
      {label} ({counts[id]})
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Mail size={20} className="text-primary-500" /> Importar desde Gmail</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full"><X size={20} className="text-slate-400" /></button>
        </div>

        {/* Rango de fechas */}
        <div className="p-4 border-b border-slate-700 bg-slate-900/40">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Desde</label>
              <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Hasta</label>
              <input type="date" value={to} min={from} max={today()} onChange={e => setTo(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Analizando correos...' : 'Analizar correos'}
            </button>
            {scanned !== null && !loading && (
              <span className="text-xs text-slate-400">{scanned} correos leídos · {rows.length} movimientos detectados</span>
            )}
          </div>
          {rows.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {chip('all', 'Todos')}
              {chip('new', 'Nuevos')}
              {chip('dup', 'Posibles duplicados')}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}
          {result && (
            <div className="mb-3 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <CheckCircle2 size={16} /> Importados {result.inserted} · Omitidos {result.skipped}
            </div>
          )}

          {rows.length === 0 && !loading ? (
            <div className="text-center text-slate-500 text-sm py-12">
              Elige un rango de fechas y pulsa <span className="text-slate-300">Analizar correos</span> para detectar movimientos en tus notificaciones bancarias.
            </div>
          ) : (
            <>
              {/* Encabezados de las dos columnas (escritorio) */}
              <div className="hidden md:grid grid-cols-2 gap-4 mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5"><CopyCheck size={13} /> Ya está en tu sistema</span>
                <span className="flex items-center gap-1.5 pl-7"><FilePlus2 size={13} /> Se va a importar</span>
              </div>

              <div className="space-y-3">
                {rows.map((r, i) => {
                  const dup = isDup(i);
                  if (filter === 'new' && dup) return null;
                  if (filter === 'dup' && !dup) return null;
                  const cats = r.type === 'expense' ? expenseCategories : incomeCategories;
                  const ms = matches[i];
                  return (
                    <div key={r.gmailId + i} className={`rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 p-3 ${r.alreadyImported ? 'border-slate-700 bg-slate-900/30 opacity-60' : r.selected ? 'border-primary-600/50 bg-slate-900/60' : 'border-slate-700 bg-slate-900/30'}`}>
                      {/* IZQUIERDA: lo que ya existe */}
                      <div className="min-w-0">
                        <p className="md:hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Ya está en tu sistema</p>
                        {ms.length === 0 ? (
                          <div className="h-full min-h-[56px] rounded-lg border border-dashed border-slate-700 flex items-center justify-center gap-2 text-xs text-slate-500 px-3 py-2">
                            <CheckCircle2 size={14} className="text-emerald-500" /> Sin coincidencias: parece un movimiento nuevo
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                              <AlertTriangle size={12} /> Posible duplicado: mismo monto y fecha cercana
                            </p>
                            {ms.map(({ t, diff }) => (
                              <div key={t.id} className="rounded-lg bg-slate-800 border border-amber-500/30 px-3 py-2 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm text-slate-200 truncate">{t.description || 'Sin descripción'}</p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {t.category} · {fmtDate(t.date)} · {diff === 0 ? 'misma fecha' : `${Math.abs(diff)} día${Math.abs(diff) === 1 ? '' : 's'} ${diff < 0 ? 'antes' : 'después'}`}
                                  </p>
                                </div>
                                <span className={`text-sm font-bold shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* DERECHA: lo que se importaría (editable) */}
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          disabled={r.alreadyImported}
                          onChange={e => update(i, { selected: e.target.checked })}
                          className="mt-2 w-4 h-4 accent-emerald-500 flex-shrink-0"
                          aria-label="Importar este movimiento"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="md:hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Se va a importar</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Tipo</label>
                              <select value={r.type} onChange={e => update(i, { type: e.target.value as 'income' | 'expense' })} className={`${inputCls} w-full`} disabled={r.alreadyImported}>
                                <option value="expense">Gasto</option>
                                <option value="income">Ingreso</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Monto</label>
                              <input type="number" value={r.amount} onChange={e => update(i, { amount: Number(e.target.value) })} className={`${inputCls} w-full`} disabled={r.alreadyImported} />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Fecha</label>
                              <input type="date" value={r.date} onChange={e => update(i, { date: e.target.value })} className={`${inputCls} w-full`} disabled={r.alreadyImported} />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Categoría</label>
                              <select value={r.category} onChange={e => update(i, { category: e.target.value })} className={`${inputCls} w-full`} disabled={r.alreadyImported}>
                                {!cats.some(c => c.name === r.category) && <option value={r.category}>{r.category}</option>}
                                {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] text-slate-500 mb-0.5">Descripción</label>
                              <input type="text" value={r.description} onChange={e => update(i, { description: e.target.value })} className={`${inputCls} w-full`} disabled={r.alreadyImported} />
                            </div>
                          </div>
                          {r.alreadyImported && (
                            <div className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1"><CheckCircle2 size={12} /> Ya importado anteriormente</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">{selectedCount} selec.</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg whitespace-nowrap">Cerrar</button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Importar {selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
