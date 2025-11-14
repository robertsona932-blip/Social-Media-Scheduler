import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      throw new Error("Your Gemini API key is not configured. Please set the API_KEY environment variable in your deployment settings.");
    }

    ai = new GoogleGenAI({ apiKey: API_KEY });
    return ai;
};

export const generatePostSuggestion = async (topic: string): Promise<string> => {
  if (!topic.trim()) {
    return "";
  }
  try {
    const client = getAiClient(); 
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a social media post about: "${topic}"`,
      config: {
        systemInstruction: "You are a witty and engaging social media copywriter. Create a short post (under 280 characters) that is interesting and includes 2-3 relevant hashtags. Do not include any preamble like 'Here is a post...'."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating content with Gemini API:", error);
    if (error instanceof Error) {
        return `AI suggestion failed: ${error.message}`;
    }
    return "Sorry, I couldn't generate a suggestion right now. Please try again.";
  }
};