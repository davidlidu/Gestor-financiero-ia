import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { AnalysisService, MonthlyAnalysis } from '../services/analysisService';

// Carga los análisis guardados y genera, uno a uno, los meses que faltan
// (desde enero del año en curso hasta el último mes cerrado).
export function useMonthlyAnalyses() {
  const [analyses, setAnalyses] = useState<Record<string, MonthlyAnalysis>>({});
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const started = useRef(false);

  const generate = async (month: string) => {
    setBusy(b => [...b, month]);
    setErrors(e => { const { [month]: _, ...rest } = e; return rest; });
    try {
      const a = await AnalysisService.generate(month);
      setAnalyses(prev => ({ ...prev, [month]: a }));
    } catch (e: any) {
      setErrors(prev => ({ ...prev, [month]: e.message || 'Error al generar el análisis.' }));
    } finally {
      setBusy(b => b.filter(m => m !== month));
      setPending(p => p.filter(m => m !== month));
    }
  };

  useEffect(() => {
    if (started.current) return; // StrictMode monta dos veces en desarrollo
    started.current = true;
    (async () => {
      try {
        const { analyses: list, pending: todo } = await AnalysisService.list();
        setAnalyses(Object.fromEntries(list.map(a => [a.month, a])));
        setPending(todo);
        for (const month of [...todo].reverse()) await generate(month); // del más antiguo al más reciente
      } catch (e: any) {
        setErrors(prev => ({ ...prev, _list: e.message }));
      }
    })();
  }, []);

  return { analyses, pending, busy, errors, generate };
}

interface Props {
  month: string; // YYYY-MM
  label: string; // "Septiembre 2026"
  hasTransactions: boolean;
  isCurrentMonth: boolean;
  analysis?: MonthlyAnalysis;
  busy: boolean;
  queued: boolean;
  error?: string;
  onGenerate: (month: string) => void;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; color: string; items: string[] }> = ({ title, icon, color, items }) =>
  items.length === 0 ? null : (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${color}`}>{icon} {title}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-300 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-slate-500">{it}</li>
        ))}
      </ul>
    </div>
  );

export const MonthlyAnalysisCard: React.FC<Props> = ({ month, label, hasTransactions, isCurrentMonth, analysis, busy, queued, error, onGenerate }) => {
  const created = analysis ? new Date(analysis.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="bg-gradient-to-br from-violet-500/10 to-slate-800/60 rounded-xl border border-violet-500/20 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Sparkles size={16} className="text-violet-400" /> Análisis con IA — {label}
        </h3>
        {analysis && !busy && (
          <button onClick={() => onGenerate(month)} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 shrink-0" title="Volver a generar el análisis">
            <RefreshCw size={12} /> Regenerar
          </button>
        )}
      </div>

      {busy || (queued && !analysis && !error) ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
          <Loader2 size={16} className="animate-spin text-violet-400" />
          {busy ? 'Analizando el mes con IA…' : 'En cola para analizar…'}
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-200 leading-relaxed">{analysis.content.summary}</p>
          <Section title="Hallazgos" icon={<TrendingUp size={12} />} color="text-emerald-400" items={analysis.content.highlights} />
          <Section title="Alertas" icon={<AlertTriangle size={12} />} color="text-amber-400" items={analysis.content.alerts} />
          <Section title="Recomendaciones" icon={<Lightbulb size={12} />} color="text-sky-400" items={analysis.content.recommendations} />
          <p className="text-[10px] text-slate-500 pt-1">
            Generado el {created}{analysis.partial ? ' · análisis parcial: el definitivo se genera el último día del mes' : ''}
          </p>
        </div>
      ) : !hasTransactions ? (
        <p className="text-sm text-slate-500 py-2">Este mes no tiene movimientos para analizar.</p>
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-sm text-slate-400">
            {isCurrentMonth
              ? 'El análisis definitivo se genera automáticamente el último día del mes. Mientras tanto puedes pedir uno parcial.'
              : 'Aún no hay un análisis para este mes.'}
          </p>
          <button onClick={() => onGenerate(month)} className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2">
            <Sparkles size={14} /> {isCurrentMonth ? 'Generar análisis parcial' : error ? 'Reintentar' : 'Generar análisis'}
          </button>
        </div>
      )}
    </div>
  );
};
