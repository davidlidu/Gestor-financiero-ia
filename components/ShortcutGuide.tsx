import React from 'react';
import { MessageCircle, Download, BellRing, ChevronRight, ChevronDown, PlusCircle, MinusCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Recreaciones de las pantallas de la app Atajos (iOS) con la configuración correcta, para guiar paso a paso.

const Phone: React.FC<{ step: number; title: string; children: React.ReactNode }> = ({ step, title, children }) => (
  <figure className="min-w-0">
    <figcaption className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
      <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[11px] flex items-center justify-center shrink-0">{step}</span>
      {title}
    </figcaption>
    <div className="rounded-[22px] bg-black border border-slate-700 p-2.5 font-[system-ui] text-[13px] text-white shadow-lg">{children}</div>
  </figure>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl bg-[#1c1c1e] overflow-hidden">{children}</div>
);
const Row: React.FC<{ children: React.ReactNode; border?: boolean }> = ({ children, border = true }) => (
  <div className={`flex items-center justify-between gap-2 px-3 py-2.5 ${border ? 'border-t border-white/10' : ''}`}>{children}</div>
);
const Token: React.FC<{ children: React.ReactNode; ok?: boolean }> = ({ children, ok = true }) => (
  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${ok ? 'bg-[#0a84ff]/20 text-[#409cff]' : 'bg-red-500/20 text-red-300'}`}>{children}</span>
);
const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <span className={`w-9 h-5 rounded-full relative shrink-0 ${on ? 'bg-[#30d158]' : 'bg-[#39393d]'}`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white ${on ? 'right-0.5' : 'left-0.5'}`} />
  </span>
);
const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] text-slate-400 mt-2 leading-snug">{children}</p>
);

export const ShortcutGuide: React.FC<{ endpoint: string }> = ({ endpoint }) => (
  <div className="mt-3 space-y-4">
    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-slate-200">
      <b>¿Se ejecuta solo?</b> Sí. Una vez creada y activa, la automatización corre sola cada vez que llega un SMS que cumple el filtro: no tienes que abrir Atajos ni la app.
    </div>

    <p className="text-sm text-slate-300">
      En el iPhone: app <b>Atajos</b> → pestaña <b>Automatización</b> → <b>+</b> → <b>Mensaje</b>. Debe quedar así (ejemplo):
    </p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Paso 1: disparador */}
      <div>
        <Phone step={1} title="Cuándo se ejecuta">
          <Card>
            <div className="px-3 pt-3 pb-2 flex items-start gap-2">
              <MessageCircle size={16} className="text-[#30d158] mt-0.5 shrink-0" />
              <span className="font-semibold leading-snug">Al recibir un mensaje en el que <ChevronDown size={13} className="inline text-[#409cff]" /></span>
            </div>
            <Row><span><Token>Mensaje</Token> contiene <Token>Bancolombia</Token></span></Row>
            <Row><span className="text-[#409cff] flex items-center gap-1"><PlusCircle size={14} /> Agregar filtro</span></Row>
            <Row><span>Automatización</span><Toggle on /></Row>
            <Row><span>Confirmar antes de ejecutar</span><Toggle on={false} /></Row>
          </Card>
        </Phone>
        <Note>
          Escribe una palabra que traigan <b>todos</b> los SMS de tu banco (por ejemplo <i>Bancolombia</i>), o usa <b>Agregar filtro → Remitente</b> con el número del banco.
          <b> Confirmar antes de ejecutar</b> debe quedar apagado para que corra solo.
        </Note>
        <div className="mt-2 rounded-md border border-sky-500/40 bg-sky-500/10 p-2 text-[11px] text-sky-100">
          <b>¿Te llegan SMS de varios bancos (Bancolombia, Nequi…)?</b> El filtro acepta una sola palabra, así que crea <b>una automatización por banco</b>,
          idéntica en todo lo demás, cambiando solo la palabra: <i>Bancolombia</i> en una y <i>NEQUI</i> en otra
          (escríbela como aparece en el SMS, por ejemplo <i>"NEQUI: Pagaste 30.500,00 en RAPPI"</i>). Las frases, el token y la URL son los mismos.
        </div>
        <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-200 flex gap-1.5">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>No pongas un espacio ni dejes el filtro vacío: con un espacio el atajo enviaría <b>todos</b> tus mensajes personales al servidor. La app los descarta si no traen tus frases, pero no deberían salir del teléfono.</span>
        </div>
      </div>

      {/* Paso 2: enviar a la app */}
      <div>
        <Phone step={2} title="Enviar el SMS a la app">
          <Card>
            <div className="px-3 pt-3 pb-2 flex items-start gap-2">
              <Download size={16} className="text-[#30d158] mt-0.5 shrink-0" />
              <span className="font-semibold leading-snug break-all">Obtener contenido de <span className="text-[#409cff] font-normal">{endpoint}</span></span>
            </div>
            <Row><span>Método</span><span className="text-[#409cff]">POST</span></Row>
            <Row><span>Encabezados</span><ChevronRight size={14} className="text-slate-500" /></Row>
            <div className="px-3 pb-2 text-[11px] text-slate-400"><code className="text-slate-300">x-shortcut-token</code> : <code className="text-slate-300">fin_… (tu token)</code></div>
            <Row><span>Solicitar cuerpo</span><span className="text-[#409cff]">JSON</span></Row>
            <Row>
              <span className="flex items-center gap-2"><MinusCircle size={15} className="text-[#ff453a]" /> text</span>
              <Token><MessageCircle size={11} /> Contenido</Token>
            </Row>
          </Card>
        </Phone>
        <Note>
          En <b>Encabezados</b> agrega la clave <code>x-shortcut-token</code> con tu token. En el cuerpo JSON, el campo <code>text</code> lleva la variable <b>Contenido</b> (el texto del SMS).
        </Note>
      </div>

      {/* Paso 3: notificación */}
      <div>
        <Phone step={3} title="Ver el resultado (opcional)">
          <Card>
            <div className="px-3 pt-3 pb-2 flex items-start gap-2">
              <BellRing size={16} className="text-[#ff453a] mt-0.5 shrink-0" />
              <span className="font-semibold leading-snug">Mostrar notificación <Token><Download size={11} /> Contenido de URL</Token></span>
            </div>
            <Row><span>Título</span><span className="text-slate-500">Finanzas</span></Row>
            <Row><span>Emitir sonido</span><Toggle on /></Row>
          </Card>
          <div className="mt-2.5 rounded-2xl bg-[#2c2c2e]/90 px-3 py-2.5">
            <p className="text-[11px] font-semibold">Finanzas <span className="float-right font-normal text-slate-500">ahora</span></p>
            <p className="text-[12px] text-slate-200 leading-snug">✅ Gasto registrado: -$42.000 en Restaurantes y domicilios</p>
          </div>
        </Phone>
        <Note>La app responde con un texto corto como el del ejemplo. Si ves texto con llaves <code>{'{ }'}</code>, actualiza la app: era el formato anterior.</Note>
      </div>
    </div>

    <div className="space-y-2 text-sm text-slate-300">
      <p className="font-semibold text-slate-200">Notificaciones que vas a ver</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><b>"Ejecutando tu automatización…"</b> es un aviso del propio iPhone y no lo controla la app. Si en el disparador te aparece <b>Notificar al ejecutar</b>, apágalo; en algunas versiones de iOS no se puede quitar.</li>
        <li><b>"✅ Gasto registrado…"</b> o <b>"✅ Ingreso registrado…"</b>: el movimiento ya está en la app.</li>
        <li><b>"ℹ️ No se registró…"</b>: el SMS no traía ninguna de tus frases, por ejemplo un código o una publicidad. Es normal.</li>
        <li><b>"⚠️ No llegó el texto del mensaje"</b>: pasa si ejecutas el atajo a mano con ▶. No es un error: se activa solo con SMS reales.</li>
      </ul>
      <p className="flex items-start gap-1.5 text-emerald-300/90">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        Para probar sin esperar una compra, pega un SMS real en el probador de abajo.
      </p>
    </div>
  </div>
);
