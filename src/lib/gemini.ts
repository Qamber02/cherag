// Client-side Gemini API service
// Note: This exposes the API key in the frontend, but it's acceptable for personal projects

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
    error?: { message: string };
}

export async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('VITE_GEMINI_API_KEY is not set in .env file');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data: GeminiResponse = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'Gemini API error');
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Specific AI functions

export async function generateSummary(context: string): Promise<string> {
    const prompt = `Summarize this text concisely for a student. Use **bold** for key terms and important concepts. Include bullet points for key highlights.

Text:
${context}`;
    return callGemini(prompt);
}

export async function generateFlashcards(context: string): Promise<Array<{ question: string, answer: string }>> {
    const prompt = `Generate 5 study flashcards as a JSON array. Format: [{"question": "...", "answer": "..."}]. No markdown.

Text:
${context}`;
    const result = await callGemini(prompt);
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
}

export async function generateQuizzes(context: string): Promise<Array<{ question: string, options: string[], correct_answer: string, explanation: string }>> {
    const prompt = `Generate 5 multiple choice questions from this text as a JSON array. 
Format: [{"question": "...", "options": ["Option A text", "Option B text", "Option C text", "Option D text"], "correct_answer": "A", "explanation": "..."}]
- Each question should have exactly 4 options with full text
- correct_answer should be just the letter (A, B, C, or D)
- Include a brief explanation for the correct answer
No markdown, just pure JSON.

Text:
${context}`;
    const result = await callGemini(prompt);
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
}



export async function generateMindMap(context: string): Promise<{ title: string, children: any[] }> {
    const prompt = `Create a mind map structure from this text as JSON.
Format: {"title": "Main Topic", "children": [{"title": "Subtopic 1", "children": [...]}, ...]}
Include all key concepts, organized hierarchically. Max 3 levels deep.
No markdown, just pure JSON.

Text:
${context}`;
    const result = await callGemini(prompt);
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
}

export async function chatWithAI(context: string, query: string): Promise<string> {
    const prompt = `You are Cherág, an AI study assistant. Answer based on the provided context.

Context:
${context || 'No context provided'}

Question: ${query}`;
    return callGemini(prompt);
}
