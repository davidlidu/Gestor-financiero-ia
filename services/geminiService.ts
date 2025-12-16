import { GoogleGenAI } from "@google/genai";

// NOTE: In a production Dokploy/N8n environment, this key would be injected securely.
// For this demo, we assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface AIResponse {
  amount: number;
  category: string;
  description: string;
  date?: string;
  type: 'income' | 'expense';
}

const CLEAN_JSON_REGEX = /```json\s*([\s\S]*?)\s*```/;

function parseAIJSON(text: string): AIResponse {
  try {
    const match = text.match(CLEAN_JSON_REGEX);
    const jsonStr = match ? match[1] : text.replace(/```/g, '');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse AI JSON response", text);
    throw new Error("Could not understand the AI response.");
  }
}

export const GeminiService = {
  /**
   * Processes an image (Receipt) to extract transaction data.
   */
  processReceipt: async (base64Image: string): Promise<AIResponse> => {
    try {
        // Remove data URL prefix if present for the raw data payload
        const base64Data = base64Image.split(',')[1] || base64Image;

        const prompt = `
          Analyze this image of a receipt or invoice. 
          Extract the following details into a valid JSON object:
          - amount (number, positive)
          - category (string, choose best from: Hogar, Comida, Transporte, Salud, Entretenimiento, Educación, Ropa, Tecnología, Otros)
          - description (string, merchant name and brief items)
          - date (string, ISO format YYYY-MM-DD, use today if not visible)
          - type (string, always 'expense' for receipts)
          
          Only return the JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [
                    { text: prompt },
                    { 
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    }
                ]
            }
        });

        return parseAIJSON(response.text || '{}');
    } catch (error) {
        console.error("Gemini Receipt Error:", error);
        throw error;
    }
  },

  /**
   * Processes audio to extract transaction intent.
   */
  processVoiceNote: async (base64Audio: string): Promise<AIResponse> => {
    try {
        const base64Data = base64Audio.split(',')[1] || base64Audio;

        const prompt = `
          Listen to this voice note describing a financial transaction.
          Extract details into a valid JSON object:
          - amount (number)
          - category (string, infer from context)
          - description (string, short summary)
          - date (string, ISO format YYYY-MM-DD, assume today unless specified)
          - type (string, 'income' or 'expense')
          
          Example: "Spent 50 dollars on groceries" -> { "amount": 50, "category": "Comida", "description": "Groceries", "type": "expense" ...}
          Only return the JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'audio/mp3', // Generic container for browser recording often works, or audio/wav
                            data: base64Data
                        }
                    }
                ]
            }
        });

         return parseAIJSON(response.text || '{}');
    } catch (error) {
         console.error("Gemini Voice Error:", error);
         throw error;
    }
  }
};
