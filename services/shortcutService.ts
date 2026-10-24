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
}

// URL pública del endpoint que llama el atajo del iPhone
export const SHORTCUT_ENDPOINT = `${API_URL}/shortcut/sms`;

export const ShortcutService = {
  status: async (): Promise<{ active: boolean }> => handle(await fetch(`${API_URL}/shortcut/token`, { headers: getHeaders() })),
  // Genera un token nuevo (invalida el anterior). Solo se muestra una vez.
  generate: async (): Promise<{ token: string }> => handle(await fetch(`${API_URL}/shortcut/token`, { method: 'POST', headers: getHeaders() })),
  revoke: async (): Promise<void> => { await handle(await fetch(`${API_URL}/shortcut/token`, { method: 'DELETE', headers: getHeaders() })); },
  // Prueba cómo se leería un SMS (no guarda nada)
  preview: async (text: string): Promise<SmsPreview> =>
    handle(await fetch(`${API_URL}/shortcut/preview`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ text }) })),
};
