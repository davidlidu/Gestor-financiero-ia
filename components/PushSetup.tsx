import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Send, Share, PlusSquare, CheckCircle2 } from 'lucide-react';
import { PushService, PushState } from '../services/pushService';

// Activar/desactivar los avisos de la app (push) en este dispositivo
export const PushSetup: React.FC = () => {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = () => PushService.getState().then(setState).catch(() => setState('unsupported'));
  useEffect(() => { refresh(); }, []);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setError(''); setMessage('');
    try { await fn(); setMessage(ok); }
    catch (e: any) { setError(e?.message || 'Algo falló.'); }
    finally { setBusy(false); refresh(); }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Bell size={20} className="text-primary-500" /> Notificaciones de la app</h2>
      <p className="text-sm text-slate-400 mb-4">
        Recibe un aviso en este dispositivo cada vez que se registre un movimiento automáticamente: desde el atajo del iPhone o por un abono de facturación.
        Con esto puedes apagar las notificaciones de la app Atajos (incluido el aviso de "ejecutando").
      </p>

      {state === null && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Revisando…</div>}

      {state === 'needs-install' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-slate-200 space-y-2">
          <p><b>En iPhone, las notificaciones solo funcionan con la app instalada.</b> Ahora la estás viendo en el navegador:</p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-300">
            <li>Abre <b>finanzas.lidutech.net</b> en <b>Safari</b>.</li>
            <li>Toca <Share size={13} className="inline -mt-0.5" /> <b>Compartir</b> → <PlusSquare size={13} className="inline -mt-0.5" /> <b>Agregar a pantalla de inicio</b>.</li>
            <li>Abre la app desde el ícono nuevo, entra a <b>Ajustes</b> y vuelve a esta sección.</li>
          </ol>
          <p className="text-xs text-slate-400">Requiere iOS 16.4 o superior.</p>
        </div>
      )}

      {state === 'unsupported' && (
        <p className="text-sm text-amber-400">Este navegador no admite notificaciones push. Prueba con Safari (app instalada), Chrome o Edge.</p>
      )}

      {state === 'denied' && (
        <div className="text-sm text-amber-300 space-y-1">
          <p>Las notificaciones están bloqueadas para esta app.</p>
          <p className="text-slate-400 text-xs">
            iPhone: <b>Ajustes → Notificaciones → DeerSystems</b> → Permitir notificaciones. En computador: el ícono del candado junto a la dirección → Notificaciones → Permitir. Luego vuelve aquí.
          </p>
        </div>
      )}

      {(state === 'off' || state === 'on') && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${state === 'on' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              {state === 'on' ? 'Activas en este dispositivo' : 'Desactivadas en este dispositivo'}
            </span>
            {state === 'off' ? (
              <button onClick={() => run(PushService.enable, 'Notificaciones activadas. Prueba con "Enviar aviso de prueba".')} disabled={busy}
                className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} Activar notificaciones
              </button>
            ) : (
              <>
                <button onClick={() => run(async () => { const r = await PushService.test(); return r; }, 'Aviso de prueba enviado. Debería llegarte en unos segundos.')} disabled={busy}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar aviso de prueba
                </button>
                <button onClick={() => run(PushService.disable, 'Notificaciones desactivadas en este dispositivo.')} disabled={busy}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <BellOff size={14} /> Desactivar
                </button>
              </>
            )}
          </div>
          {message && <p className="text-sm text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> {message}</p>}
          {state === 'on' && (
            <p className="text-xs text-slate-500">
              Cada dispositivo se activa por separado (tu iPhone, tu computador…). Ya puedes quitar la acción "Mostrar notificación" de tus automatizaciones
              y apagar las notificaciones de Atajos: <b>Ajustes → Tiempo en pantalla → Ver toda la actividad → Notificaciones → Atajos</b>.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
};
