# Cherág - AI Study Partner

Cherág is an advanced AI-powered study companion designed to help students learn more effectively. By analyzing uploaded course materials (PDFs, docs, notes), it generates personalized study aids including flashcards, quizzes, summaries, mind maps, and curated video recommendations.

##  Key Features

*   **Intelligent Dashboard**: Upload lecture notes and documents to get started. Supports PDF, DOCX, TXT, and MD files.
*   **AI Chat Assistant**: Ask questions about your materials and get accurate, context-aware answers.
*   **Smart Flashcards**: Automatically generate flashcards from your documents to test your memory.
*   **Quiz Generator**: Create multiple-choice quizzes with explanations to assess your understanding.
*   **AI Summaries**: Get concise, bulleted summaries of long documents with key terms highlighted.
*   **Visual Learning**:
    *   **Mind Maps**: Interactive hierarchical visualization of concepts.
    *   **Diagrams**: Auto-generated Mermaid.js flowcharts and process diagrams.
*   **Study Shorts**: curated YouTube video recommendations based on your study topics.
*   **Multi-Model AI**: Powered by Google Gemini 2.0 Flash, with fallbacks to OpenRouter (Molmo) and Hugging Face for reliability.

##  Tech Stack

*   **Frontend**: React (v19), TypeScript, Vite
*   **Styling**: TailwindCSS, Lucide React (Icons), Framer Motion (Animations)
*   **Backend / Database**: Supabase (Auth & Database)
*   **AI Services**:
    *   Google Gemini API (Primary)
    *   OpenRouter (Optional/Secondary)
    *   Hugging Face Inference API (Fallback)
*   **External APIs**: YouTube Data API (for Study Shorts)
*   **Visualization**: Mermaid.js, React Flow

##  Prerequisites

*   Node.js (v18 or higher)
*   npm
*   A Supabase project
*   Google Gemini API Key
*   (Optional) YouTube Data API Keys, OpenRouter Key, Hugging Face Key

##  Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd cherag
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory based on `.env.example`:

    ```env
    # Supabase Configuration (Required)
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

    # AI Configuration (Required)
    VITE_GEMINI_API_KEY=your_gemini_api_key

    # Optional AI/Feature Keys
    VITE_YOUTUBE_API_KEY=your_youtube_api_key   # For "Study Shorts" video recommendations
    VITE_OPENROUTER_API_KEY=your_openrouter_key # For alternative models (e.g. Molmo)
    VITE_HUGGINGFACE_API_KEY=your_hf_key        # For fallback generation
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

##  Project Structure

```
src/
├── components/        # UI Components (Dashboard, Tabs, Sidebar)
│   ├── Dashboard.tsx  # Main layout
│   ├── ChatTab.tsx    # Chat interface
│   ├── FlashcardsTab.tsx
│   ├── MindMapTab.tsx
│   └── ...
├── hooks/             # Custom React Hooks
│   ├── useChat.ts
│   ├── useFiles.ts
│   └── useStudyShorts.ts
├── lib/               # Utilities & Services
│   ├── aiService.ts       # Central AI logic (Gemini/OpenRouter/HF)
│   ├── supabaseClient.ts  # Database connection
│   └── fileParser.ts      # Document processing
└── App.tsx            # Routing & Auth state
```

##  Authentication

Authentication is handled via Supabase Auth. The app supports email/password login and sign-up. Ensure your Supabase project is configured to allow email authentication.

## License
MIT License

## 🤝 Contributing

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## Project URL
https://cherag.pages.dev/auth
