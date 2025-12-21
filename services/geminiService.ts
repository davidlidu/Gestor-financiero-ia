import { AuthService } from './authService';

// URL de tu API (Asegúrate de que VITE_API_URL esté bien, si no usa la relativa '/api')
const API_URL = import.meta.env.VITE_API_URL || 'https://api.finanzas.lidutech.net/api'; // O tu URL directa

const processWithBackend = async (type: 'receipt' | 'voice', base64Data: string) => {
    const token = (await AuthService.getSession())?.token; // O localStorage.getItem('lidutech_session_token');
    
    const response = await fetch(`${API_URL}/ai/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, base64Data })
    });

    if (!response.ok) {
        throw new Error('Error comunicando con el servidor de IA');
    }

    return await response.json();
};

export const GeminiService = {
  processReceipt: async (base64Image: string) => {
      return await processWithBackend('receipt', base64Image);
  },
  processVoiceNote: async (base64Audio: string) => {
      return await processWithBackend('voice', base64Audio);
  }
};