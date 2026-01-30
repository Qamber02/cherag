
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
        const { document_id, content, chunk_offset = 0 } = await req.json()
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) throw new Error('Missing GEMINI_API_KEY')

        // 0. Verify User (Security)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        // Verify document ownership
        const { data: doc, error: docError } = await supabaseClient
            .from('documents')
            .select('user_id')
            .eq('id', document_id)
            .single()

        if (docError || !doc || doc.user_id !== user.id) {
            throw new Error('Unauthorized: Document access denied')
        }

        const supabaseAdmin = createClient(
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

        interface EmbeddingItem {
            document_id: string;
            content: string;
            embedding: number[];
            chunk_index: number;
        }

        // 2. Generate Embeddings (Batch if possible, but Gemini limit is 100 calls/min?)
        // text-embedding-004 supports batching content.
        const embeddingsMap: EmbeddingItem[] = [];

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
                        chunk_index: chunk_offset + i + idx
                    });
                });
            }
        }

        // 3. Store in DB
        const { error } = await supabaseAdmin
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
