const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SESSION_KEY = 'lidutech_session_token';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem(SESSION_KEY)}`,
});

export interface AnalysisContent {
  summary: string;
  highlights: string[];
  alerts: string[];
  recommendations: string[];
}

export interface MonthlyAnalysis {
  month: string; // YYYY-MM
  content: AnalysisContent;
  partial: boolean; // generado antes de cerrar el mes
  createdAt: string;
}

export const AnalysisService = {
  // Análisis guardados + meses que aún faltan por generar
  list: async (): Promise<{ analyses: MonthlyAnalysis[]; pending: string[] }> => {
    const res = await fetch(`${API_URL}/ai/monthly-analyses`, { headers: getHeaders() });
    if (!res.ok) throw new Error('No se pudieron cargar los análisis.');
    return res.json();
  },

  // Genera (o regenera) el análisis de un mes
  generate: async (month: string): Promise<MonthlyAnalysis> => {
    const res = await fetch(`${API_URL}/ai/monthly-analyses/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ month }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo generar el análisis.');
    return data;
  },
};
