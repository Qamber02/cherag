/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_YOUTUBE_API_KEY?: string
    readonly VITE_OPENROUTER_API_KEY?: string
    readonly VITE_HUGGINGFACE_API_KEY?: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
