const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SESSION_KEY = 'lidutech_session_token';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem(SESSION_KEY)}`,
});

export interface ImportCandidate {
  gmailId: string;
  amount: number;
  type: 'income' | 'expense';
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  paymentMethod: 'cash' | 'transfer';
  alreadyImported?: boolean;
}

export interface GoogleStatus {
  configured: boolean;
  linked: boolean;
  email?: string | null;
}

export const GoogleService = {
  // Estado de vinculación de la cuenta de Google
  getStatus: async (): Promise<GoogleStatus> => {
    try {
      const res = await fetch(`${API_URL}/google/status`, { headers: getHeaders() });
      if (!res.ok) return { configured: false, linked: false };
      return await res.json();
    } catch {
      return { configured: false, linked: false };
    }
  },

  // Obtiene la URL de consentimiento de Google
  getAuthUrl: async (): Promise<string> => {
    const res = await fetch(`${API_URL}/google/auth-url`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar la vinculación con Google.');
    return data.url;
  },

  // Desvincula la cuenta
  unlink: async (): Promise<void> => {
    const res = await fetch(`${API_URL}/google/unlink`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('No se pudo desvincular la cuenta.');
  },

  // Previsualiza los movimientos detectados en un rango de fechas
  preview: async (from: string, to: string): Promise<{ candidates: ImportCandidate[]; scanned: number }> => {
    const res = await fetch(`${API_URL}/google/import/preview`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ from, to }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al analizar los correos.');
    return data;
  },

  // Importa los movimientos seleccionados
  confirm: async (items: ImportCandidate[]): Promise<{ inserted: number; skipped: number }> => {
    const res = await fetch(`${API_URL}/google/import/confirm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al importar los movimientos.');
    return data;
  },
};
