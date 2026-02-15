/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    // Moved to backend: GEMINI, YOUTUBE, OPENROUTER, HUGGINGFACE
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
