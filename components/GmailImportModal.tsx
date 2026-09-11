import React, { useState } from 'react';
import { X, Search, Loader2, Download, CheckCircle2, Mail, AlertTriangle } from 'lucide-react';
import { Category } from '../types';
import { GoogleService, ImportCandidate } from '../services/googleService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenseCategories: Category[];
  incomeCategories: Category[];
  onImported: () => void;
}

type Row = ImportCandidate & { selected: boolean };

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};
const today = () => daysAgo(0);

export const GmailImportModal: React.FC<Props> = ({ isOpen, onClose, expenseCategories, incomeCategories, onImported }) => {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [scanned, setScanned] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true); setError(''); setResult(null); setRows([]); setScanned(null);
    try {
      const { candidates, scanned } = await GoogleService.preview(from, to);
      setScanned(scanned);
      setRows(candidates.map(c => ({ ...c, selected: !c.alreadyImported })));
    } catch (e: any) {
      setError(e.message || 'Error al analizar los correos.');
    } finally {
      setLoading(false);
    }
  };

  const update = (i: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const selectedCount = rows.filter(r => r.selected && !r.alreadyImported).length;

  const handleImport = async () => {
    const items = rows.filter(r => r.selected && !r.alreadyImported);
    if (items.length === 0) return;
    setImporting(true); setError('');
    try {
      const res = await GoogleService.confirm(items);
      setResult(res);
      // Marca como importados los que se enviaron
      setRows(prev => prev.map(r => (r.selected && !r.alreadyImported) ? { ...r, alreadyImported: true, selected: false } : r));
      onImported();
    } catch (e: any) {
      setError(e.message || 'Error al importar.');
    } finally {
      setImporting(false);
    }
  };

  const inputCls = 'bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-primary-500';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
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
            <div className="space-y-2">
              {rows.map((r, i) => {
                const cats = r.type === 'expense' ? expenseCategories : incomeCategories;
                return (
                  <div key={r.gmailId + i} className={`rounded-lg border p-3 ${r.alreadyImported ? 'border-slate-700 bg-slate-900/30 opacity-60' : r.selected ? 'border-primary-600/50 bg-slate-900/60' : 'border-slate-700 bg-slate-900/30'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        disabled={r.alreadyImported}
                        onChange={e => update(i, { selected: e.target.checked })}
                        className="mt-2 w-4 h-4 accent-emerald-500 flex-shrink-0"
                      />
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                        {/* Tipo */}
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Tipo</label>
                          <select value={r.type} onChange={e => update(i, { type: e.target.value as 'income' | 'expense' })} className={`${inputCls} w-full`} disabled={r.alreadyImported}>
                            <option value="expense">Gasto</option>
                            <option value="income">Ingreso</option>
                          </select>
                        </div>
                        {/* Monto */}
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Monto</label>
                          <input type="number" value={r.amount} onChange={e => update(i, { amount: Number(e.target.value) })} className={`${inputCls} w-full`} disabled={r.alreadyImported} />
                        </div>
                        {/* Fecha */}
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Fecha</label>
                          <input type="date" value={r.date} onChange={e => update(i, { date: e.target.value })} className={`${inputCls} w-full`} disabled={r.alreadyImported} />
                        </div>
                        {/* Categoría */}
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Categoría</label>
                          <select value={r.category} onChange={e => update(i, { category: e.target.value })} className={`${inputCls} w-full`} disabled={r.alreadyImported}>
                            {!cats.some(c => c.name === r.category) && <option value={r.category}>{r.category}</option>}
                            {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        {/* Descripción */}
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Descripción</label>
                          <input type="text" value={r.description} onChange={e => update(i, { description: e.target.value })} className={`${inputCls} w-full`} disabled={r.alreadyImported} />
                        </div>
                      </div>
                    </div>
                    {r.alreadyImported && (
                      <div className="mt-1 ml-7 text-[11px] text-amber-400 flex items-center gap-1"><CheckCircle2 size={12} /> Ya importado anteriormente</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">{selectedCount} seleccionados</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg">Cerrar</button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
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
