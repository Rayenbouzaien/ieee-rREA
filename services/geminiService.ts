import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

// Initialize client (in a real app, this might happen earlier or lazily)
const getClient = () => {
  if (!aiClient) {
    // In a real production build, use a proxy or server-side call.
    // For this demo, we assume the env var is present or the user provides it (though we cannot ask for it per rules).
    // We strictly follow the rule: process.env.API_KEY
    if (process.env.API_KEY) {
      aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
        console.warn("API_KEY not found in environment.");
    }
  }
  return aiClient;
};

export const generateSectionContent = async (
  context: string,
  sectionLabel: string,
  userPrompt: string
): Promise<string> => {
  const client = getClient();
  if (!client) {
    throw new Error("Gemini API Key is missing.");
  }

  const systemInstruction = `You are an expert academic and technical writer. 
  You are assisting a student or professional in writing a report section titled "${sectionLabel}".
  The report type context is: ${context}.
  Return clean, well-structured text suitable for the report. Do not include markdown code blocks unless specifically asked for code.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "No content generated.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate content. Please try again.");
  }
};