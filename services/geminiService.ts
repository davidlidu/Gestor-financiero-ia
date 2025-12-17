import { GoogleGenerativeAI } from "@google/generative-ai";

// Definición de la respuesta esperada
interface AIResponse {
  amount: number;
  category: string;
  description: string;
  date?: string;
  type: 'income' | 'expense';
}

// Regex para limpiar bloques de código ```json ... ``` que a veces devuelve la IA
const CLEAN_JSON_REGEX = /```json\s*([\s\S]*?)\s*```/;

/**
 * Función auxiliar para parsear la respuesta de texto a JSON
 */
function parseAIJSON(text: string): AIResponse {
  try {
    const match = text.match(CLEAN_JSON_REGEX);
    const jsonStr = match ? match[1] : text.replace(/```/g, ''); // Limpiar comillas markdown si falló el regex
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse AI JSON response", text);
    throw new Error("No se pudo entender la respuesta de la IA. Intenta de nuevo.");
  }
}

/**
 * Función auxiliar para obtener la instancia de Gemini
 * Esto evita que la app explote al inicio si falta la clave.
 */
const getGeminiModel = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Falta la VITE_GEMINI_API_KEY en las variables de entorno");
    throw new Error("Falta la API Key de Gemini. Revisa la configuración.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Usamos gemini-1.5-flash porque es rápido y económico para esta tarea
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

export const GeminiService = {
  /**
   * Procesa una imagen (Factura/Recibo)
   */
  processReceipt: async (base64Image: string): Promise<AIResponse> => {
    try {
        const model = getGeminiModel();
        
        // Limpiamos el prefijo data:image/...;base64, si existe
        const base64Data = base64Image.includes(',') 
            ? base64Image.split(',')[1] 
            : base64Image;

        const prompt = `
          Analiza esta imagen de un recibo o factura.
          Extrae los siguientes detalles en un objeto JSON válido (sin texto adicional):
          - amount (number, positivo)
          - category (string, elige la mejor entre: Hogar, Comida, Transporte, Salud, Entretenimiento, Educación, Ropa, Tecnología, Otros)
          - description (string, nombre del comercio y resumen breve)
          - date (string, formato ISO YYYY-MM-DD, usa la fecha de hoy si no es visible)
          - type (string, siempre 'expense' para recibos)
          
          Responde SOLO con el JSON.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "image/jpeg", // Gemini suele aceptar png/jpeg genéricos
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        
        return parseAIJSON(text);

    } catch (error) {
        console.error("Gemini Receipt Error:", error);
        throw error;
    }
  },

  /**
   * Procesa una nota de voz (Audio)
   */
  processVoiceNote: async (base64Audio: string): Promise<AIResponse> => {
    try {
        const model = getGeminiModel();

        const base64Data = base64Audio.includes(',') 
            ? base64Audio.split(',')[1] 
            : base64Audio;

        const prompt = `
          Escucha esta nota de voz describiendo una transacción financiera.
          Extrae los detalles en un objeto JSON válido:
          - amount (number)
          - category (string, infiere según el contexto)
          - description (string, resumen corto)
          - date (string, formato ISO YYYY-MM-DD, asume hoy a menos que se diga otra cosa)
          - type (string, 'income' o 'expense')
          
          Ejemplo: "Gasté 50 mil en comida" -> { "amount": 50000, "category": "Comida", "description": "Comida", "type": "expense" }
          Responde SOLO con el JSON.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    // Nota: Los navegadores suelen grabar en webm o mp4. 
                    // Si tienes problemas, intenta convertir a mp3 antes o usa 'audio/webm'
                    mimeType: "audio/mp3", 
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        return parseAIJSON(text);

    } catch (error) {
         console.error("Gemini Voice Error:", error);
         throw error;
    }
  }
};