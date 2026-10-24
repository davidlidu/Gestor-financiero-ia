const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('lidutech_session_token')}`,
});

const handle = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
};

export interface SmsPreview {
  isTransaction: boolean;
  type: 'income' | 'expense';
  amount: number | null;
  date: string;
  description: string;
  category: string;
  paymentMethod: 'cash' | 'transfer';
  reason?: string;
  accounts?: { label: string; isOwn: boolean }[];
}

export interface SmsRules { income: string[]; expense: string[] }

// URL pública del endpoint que llama el atajo del iPhone
export const SHORTCUT_ENDPOINT = `${API_URL}/shortcut/sms`;

export const ShortcutService = {
  status: async (): Promise<{ active: boolean }> => handle(await fetch(`${API_URL}/shortcut/token`, { headers: getHeaders() })),
  // Genera un token nuevo (invalida el anterior). Solo se muestra una vez.
  generate: async (): Promise<{ token: string }> => handle(await fetch(`${API_URL}/shortcut/token`, { method: 'POST', headers: getHeaders() })),
  revoke: async (): Promise<void> => { await handle(await fetch(`${API_URL}/shortcut/token`, { method: 'DELETE', headers: getHeaders() })); },
  getRules: async (): Promise<SmsRules> => handle(await fetch(`${API_URL}/shortcut/rules`, { headers: getHeaders() })),
  saveRules: async (rules: SmsRules): Promise<SmsRules> =>
    handle(await fetch(`${API_URL}/shortcut/rules`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(rules) })),
  // Prueba cómo se leería un SMS (no guarda nada)
  preview: async (text: string): Promise<SmsPreview> =>
    handle(await fetch(`${API_URL}/shortcut/preview`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ text }) })),
};
