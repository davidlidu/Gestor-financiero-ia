import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Trash2, Bot } from 'lucide-react';
import { ChatService, ChatMessage } from '../services/chatService';

interface Props {
  userId: string;
  userName?: string;
}

const SUGGESTIONS = [
  '¿Cuánto llevo gastado este mes y en qué?',
  '¿En qué categoría gasté más el mes pasado?',
  '¿Cómo voy con mis presupuestos?',
  'Compara mis gastos de este mes con el anterior',
  '¿Cuáles fueron mis 5 gastos más grandes de los últimos 30 días?',
  '¿Cuánto he ahorrado en mis metas?',
];

// Formato mínimo de la respuesta: **negritas**, listas con "- " y saltos de línea
const renderInline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="text-white">{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  );
const Formatted: React.FC<{ text: string }> = ({ text }) => {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length} className="list-disc pl-5 space-y-1 my-1">{list.map((l, i) => <li key={i}>{renderInline(l)}</li>)}</ul>);
    list = [];
  };
  text.split('\n').forEach(line => {
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) { list.push(m[1]); return; }
    flush();
    if (line.trim()) blocks.push(<p key={blocks.length} className="my-1">{renderInline(line.replace(/^#+\s*/, ''))}</p>);
  });
  flush();
  return <>{blocks}</>;
};

export const FinanceChat: React.FC<Props> = ({ userId, userName }) => {
  const storageKey = `lidutech_chat_${userId}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // La conversación se guarda solo en este dispositivo, por usuario (últimos 40 mensajes)
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40))); } catch { /* sin almacenamiento */ }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const reply = await ChatService.send(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(e?.message || 'No se pudo obtener respuesta.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clear = () => {
    if (messages.length && !confirm('¿Borrar la conversación?')) return;
    setMessages([]); setError('');
  };

  const firstName = (userName || '').split(' ')[0];

  return (
    <div className="flex flex-col h-[calc(100dvh-10.5rem)] md:h-[calc(100dvh-4rem)] min-h-[360px] bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700">
        <div className="min-w-0">
          <h2 className="font-bold text-white flex items-center gap-2"><Sparkles size={18} className="text-violet-400" /> Habla con tus finanzas</h2>
          <p className="text-[11px] text-slate-500 truncate">Responde con tus movimientos, presupuestos y metas. Puede equivocarse: verifica las cifras importantes.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} className="shrink-0 text-slate-500 hover:text-red-400 p-1.5" aria-label="Borrar conversación" title="Borrar conversación"><Trash2 size={16} /></button>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-400 flex items-center justify-center mx-auto mb-3"><Bot size={24} /></div>
            <p className="text-slate-200 font-semibold">Hola{firstName ? `, ${firstName}` : ''} 👋</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Pregúntame lo que quieras sobre tu plata. Por ejemplo:</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="text-xs text-left px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:border-violet-500/60 hover:text-white transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${m.role === 'user'
              ? 'bg-primary-600 text-white rounded-br-md whitespace-pre-wrap'
              : 'bg-slate-900 border border-slate-700 text-slate-200 rounded-bl-md'}`}>
              {m.role === 'assistant' ? <Formatted text={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-violet-400" /> Revisando tus finanzas…
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-3.5 py-2 text-sm text-red-300">
              {error}{' '}
              <button onClick={() => { const last = messages[messages.length - 1]; if (last?.role === 'user') { setMessages(messages.slice(0, -1)); send(last.content); } }} className="underline">Reintentar</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Entrada */}
      <form onSubmit={e => { e.preventDefault(); send(input); }} className="border-t border-slate-700 p-2.5 sm:p-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1}
          placeholder="Escribe tu pregunta…"
          className="flex-1 min-w-0 resize-none max-h-32 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
          aria-label="Pregunta"
        />
        <button type="submit" disabled={!input.trim() || loading} className="shrink-0 w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white flex items-center justify-center" aria-label="Enviar">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};
