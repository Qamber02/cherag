
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { query, context, mode } = await req.json()
        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) throw new Error('Missing GEMINI_API_KEY')

        let prompt = ''
        if (mode === 'chat') {
            prompt = `You are Cherág. Answer the user's question based strictly on the provided context.\n\nContext:\n${context}\n\nQuestion: ${query}`
        } else if (mode === 'summary') {
            prompt = `Summarize the provided text concisely into key points.\n\nText:\n${context}`
        } else if (mode === 'flashcards') {
            prompt = `Generate 5 flashcards from the text. Return ONLY a valid JSON array of objects with keys 'question' and 'answer'. Example: [{"question": "...", "answer": "..."}]. Do not wrap in markdown.\n\nText:\n${context}`
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        )

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API Error')
        }

        let result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        if (mode === 'flashcards') {
            result = result.replace(/```json/g, '').replace(/```/g, '').trim()
        }

        return new Response(JSON.stringify({ result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || String(error) }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
