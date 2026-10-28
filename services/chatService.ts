const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatService = {
  // Envía la conversación; el servidor responde usando solo los datos del usuario autenticado
  send: async (messages: ChatMessage[]): Promise<string> => {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('lidutech_session_token')}`,
      },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo obtener respuesta.');
    return data.reply;
  },
};
