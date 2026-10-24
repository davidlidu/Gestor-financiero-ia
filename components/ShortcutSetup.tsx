import React, { useEffect, useState } from 'react';
import { Smartphone, Copy, Check, Loader2, KeyRound, FlaskConical, AlertTriangle, X, Plus } from 'lucide-react';
import { ShortcutService, SHORTCUT_ENDPOINT, SmsPreview, SmsRules } from '../services/shortcutService';
import { formatMoney } from '../utils/format';
import { ShortcutGuide } from './ShortcutGuide';

const CopyButton: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* sin permiso de portapapeles */ }
      }}
      className="shrink-0 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1"
      aria-label={`Copiar ${label}`}
    >
      {done ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {done ? 'Copiado' : 'Copiar'}
    </button>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-slate-500 mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-emerald-300 break-all">{value}</code>
      <CopyButton value={value} label={label} />
    </div>
  </div>
);

// Lista editable de frases (chips)
const PhraseList: React.FC<{ title: string; color: string; items: string[]; onChange: (v: string[]) => void }> = ({ title, color, items, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !items.some(i => i.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      <p className={`text-xs font-semibold mb-1.5 ${color}`}>{title}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map(i => (
          <span key={i} className="inline-flex items-center gap-1 bg-slate-900 border border-slate-600 rounded-full pl-2.5 pr-1 py-0.5 text-xs text-slate-200">
            {i}
            <button type="button" onClick={() => onChange(items.filter(x => x !== i))} className="text-slate-500 hover:text-red-400 p-0.5" aria-label={`Quitar ${i}`}><X size={12} /></button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-slate-500">Sin frases</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ej: Recibiste un pago"
          className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white"
          aria-label={`Nueva frase de ${title}`}
        />
        <button type="button" onClick={add} className="shrink-0 bg-slate-700 hover:bg-slate-600 text-white text-xs px-2.5 rounded-lg flex items-center gap-1"><Plus size={13} /> Agregar</button>
      </div>
    </div>
  );
};

export const ShortcutSetup: React.FC = () => {
  const [active, setActive] = useState<boolean | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sample, setSample] = useState('');
  const [testing, setTesting] = useState(false);
  const [preview, setPreview] = useState<SmsPreview | null>(null);

  const [rules, setRules] = useState<SmsRules | null>(null);
  const [rulesSaved, setRulesSaved] = useState(true);
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    ShortcutService.status().then(s => setActive(s.active)).catch(() => setActive(false));
    ShortcutService.getRules().then(setRules).catch(() => setRules({ income: [], expense: [] }));
  }, []);

  const changeRules = (r: SmsRules) => { setRules(r); setRulesSaved(false); };
  const saveRules = async () => {
    if (!rules) return;
    setSavingRules(true); setError('');
    try { setRules(await ShortcutService.saveRules(rules)); setRulesSaved(true); }
    catch (e: any) { setError(e.message); }
    finally { setSavingRules(false); }
  };

  const generate = async () => {
    if (active && !confirm('Se creará un token nuevo y el atajo actual dejará de funcionar hasta que lo actualices. ¿Continuar?')) return;
    setBusy(true); setError('');
    try { const { token } = await ShortcutService.generate(); setToken(token); setActive(true); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const revoke = async () => {
    if (!confirm('El atajo del iPhone dejará de registrar movimientos. ¿Desactivarlo?')) return;
    setBusy(true); setError('');
    try { await ShortcutService.revoke(); setActive(false); setToken(''); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const test = async () => {
    setTesting(true); setError(''); setPreview(null);
    try { setPreview(await ShortcutService.preview(sample)); }
    catch (e: any) { setError(e.message); }
    finally { setTesting(false); }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Smartphone size={20} className="text-primary-500" /> Atajo de iPhone (SMS de compras)</h2>
      <p className="text-sm text-slate-400 mb-4">
        Cuando te llegue el mensaje del banco por una compra, el iPhone lo envía solo a la app y queda registrado el movimiento.
      </p>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {active === null ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              {active ? 'Token activo' : 'Sin token'}
            </span>
            <button onClick={generate} disabled={busy} className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} {active ? 'Generar token nuevo' : 'Generar token'}
            </button>
            {active && (
              <button onClick={revoke} disabled={busy} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded-lg">Desactivar</button>
            )}
          </div>

          {token && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-3">
              <p className="text-xs text-amber-300 flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Copia el token ahora: por seguridad no se vuelve a mostrar. Quien lo tenga puede registrar movimientos en tu cuenta.
              </p>
              <Field label="Token" value={token} />
            </div>
          )}

          <div className="space-y-3">
            <Field label="URL" value={SHORTCUT_ENDPOINT} />
            <Field label="Nombre del encabezado" value="x-shortcut-token" />
          </div>

          {rules && (
            <div className="rounded-lg border border-slate-700 p-3 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-200">Frases que reconoce el atajo</p>
                <p className="text-xs text-slate-500">Solo se registran los mensajes que contengan alguna de estas frases (sin importar mayúsculas ni tildes), y la frase define si es ingreso o gasto.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PhraseList title="Ingresos" color="text-emerald-400" items={rules.income} onChange={income => changeRules({ ...rules, income })} />
                <PhraseList title="Gastos" color="text-red-400" items={rules.expense} onChange={expense => changeRules({ ...rules, expense })} />
              </div>
              <div className="flex items-center justify-end gap-3">
                {rulesSaved ? <span className="text-xs text-slate-500">Guardado</span> : <span className="text-xs text-amber-400">Cambios sin guardar</span>}
                <button onClick={saveRules} disabled={rulesSaved || savingRules} className="bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                  {savingRules ? 'Guardando...' : 'Guardar frases'}
                </button>
              </div>
            </div>
          )}

          <details className="rounded-lg border border-slate-700 p-3" open={!!token}>
            <summary className="text-sm font-semibold text-slate-200 cursor-pointer">Cómo crear la automatización en el iPhone</summary>
            <ShortcutGuide endpoint={SHORTCUT_ENDPOINT} />
            <p className="mt-3 text-xs text-slate-500">
              Solo funciona con <b>mensajes de texto (SMS/iMessage)</b>; las notificaciones push de la app del banco no las puede leer un atajo.
              Los mensajes que no son movimientos (códigos, publicidad) se ignoran, y si el atajo se dispara dos veces con el mismo mensaje no se duplica.
            </p>
          </details>

          {/* Probador */}
          <div className="rounded-lg border border-slate-700 p-3 space-y-2">
            <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5"><FlaskConical size={14} className="text-primary-400" /> Probar con un mensaje</p>
            <textarea
              value={sample}
              onChange={e => setSample(e.target.value)}
              rows={3}
              placeholder="Pega aquí un SMS de tu banco, ej: Bancolombia: Compraste $42.000 en RAPPI con tu T.Deb *1234 el 03/08/2026"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            />
            <button onClick={test} disabled={testing || !sample.trim()} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              {testing && <Loader2 size={14} className="animate-spin" />} Ver cómo se registraría
            </button>
            {preview && (
              preview.isTransaction ? (
                <div className="text-sm bg-slate-900 rounded-lg border border-slate-700 p-3 space-y-1">
                  <p className={preview.type === 'income' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {preview.type === 'income' ? '+' : '-'}${formatMoney(preview.amount || 0)} · {preview.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </p>
                  <p className="text-slate-300">{preview.description}</p>
                  <p className="text-xs text-slate-500">{preview.category} · {preview.date} · {preview.paymentMethod === 'cash' ? 'Efectivo' : 'Banco'}</p>
                  {preview.accounts && preview.accounts.length > 0 && (
                    <p className="text-xs text-sky-400">Cuentas reconocidas: {preview.accounts.map(a => a.label + (a.isOwn ? ' (tuya)' : '')).join(', ')}</p>
                  )}
                  <p className="text-[11px] text-slate-600">Es solo una vista previa: no se guardó nada.</p>
                </div>
              ) : (
                <p className="text-sm text-amber-400">El atajo ignoraría este mensaje: {preview.reason || 'no parece un movimiento de dinero.'}</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
