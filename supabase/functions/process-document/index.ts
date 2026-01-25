
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { document_id, content } = await req.json()
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) throw new Error('Missing GEMINI_API_KEY')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use Service Role for DB writes
        )

        // 1. Chunking Strategy (Simple split for now, 1000 chars overlap)
        const chunkSize = 1000;
        const overlap = 100;
        const chunks: string[] = [];

        for (let i = 0; i < content.length; i += (chunkSize - overlap)) {
            chunks.push(content.slice(i, i + chunkSize));
        }

        // 2. Generate Embeddings (Batch if possible, but Gemini limit is 100 calls/min?)
        // text-embedding-004 supports batching content.
        const embeddingsMap = [];

        // Process in batches of 20 to be safe
        const batchSize = 20;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requests: batch.map(text => ({
                            model: "models/text-embedding-004",
                            content: { parts: [{ text }] }
                        }))
                    })
                }
            );

            if (!response.ok) {
                const err = await response.json();
                console.error('Embedding Error', err);
                throw new Error('Failed to generate embeddings');
            }

            const data = await response.json();
            // data.embeddings is array of { values: [...] }

            if (data.embeddings) {
                batch.forEach((text, idx) => {
                    embeddingsMap.push({
                        document_id,
                        content: text,
                        embedding: data.embeddings[idx].values,
                        chunk_index: i + idx
                    });
                });
            }
        }

        // 3. Store in DB
        const { error } = await supabaseClient
            .from('document_chunks')
            .insert(embeddingsMap);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, chunks_count: embeddingsMap.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
