# Cherag Mobile

AI-powered study partner Android application built with React Native and Expo.

## Features

- **Summary Generation** - AI-generated summaries from your documents
- **Flashcards** - Interactive study cards with flip animation
- **Quizzes** - Multiple choice questions with explanations
- **AI Chat** - Context-aware conversations about your materials
- **Learning Roadmap** - Visual topic hierarchy with explanations
- **Study Shorts** - Educational YouTube video search
- **Activity History** - Track your study progress

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Navigation**: Expo Router (file-based routing)
- **Styling**: Custom design system with responsive scaling
- **Backend**: Supabase (Auth, Database, Storage)
- **AI**: Google Gemini API
- **Animations**: React Native Reanimated

## Project Structure

```
cherag-mobile/
├── app/                      # Expo Router screens
│   ├── (auth)/               # Authentication screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (main)/               # Main app screens
│   │   ├── index.tsx         # Dashboard
│   │   ├── chat.tsx
│   │   ├── summary.tsx
│   │   ├── flashcards.tsx
│   │   ├── quizzes.tsx
│   │   ├── mindmap.tsx
│   │   ├── videos.tsx
│   │   ├── history.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx           # Root layout
│   └── index.tsx             # Entry redirect
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # Base components (Button, Card, Input)
│   │   ├── FlashcardItem.tsx
│   │   ├── QuizCard.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── VideoCard.tsx
│   │   └── DocumentItem.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useFiles.ts
│   │   ├── useChat.ts
│   │   └── useFlashcards.ts
│   ├── lib/                  # Services and utilities
│   │   ├── supabase.ts       # Supabase client
│   │   ├── aiService.ts      # AI API calls
│   │   └── storage.ts        # AsyncStorage/SecureStore
│   ├── styles/               # Design system
│   │   ├── theme.ts          # Colors, typography, spacing
│   │   ├── responsive.ts     # Phone/tablet scaling
│   │   └── commonStyles.ts   # Shared styles
│   └── types/                # TypeScript definitions
└── assets/                   # Images and fonts
```

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio (for Android emulator)
- Expo Go app (for physical device testing)

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd cherag-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

4. Add your API keys to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   EXPO_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
   ```

### Development

Start the development server:
```bash
npm start
```

Run on Android emulator:
```bash
npm run android
```

### Building APK

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure build:
   ```bash
   eas build:configure
   ```

4. Build APK (for testing):
   ```bash
   eas build -p android --profile preview
   ```

5. Build AAB (for Play Store):
   ```bash
   eas build -p android --profile production
   ```

## Responsive Design

The app supports both phones and tablets with automatic layout adjustment:

- **Phones**: Single-column layout, optimized for touch
- **Tablets**: Multi-column grids, larger touch targets, centered content

Key utilities in `src/styles/responsive.ts`:
- `scale()` - Horizontal scaling
- `verticalScale()` - Vertical scaling
- `moderateScale()` - Balanced scaling for fonts/icons
- `isTablet()` - Device detection
- `getGridColumns()` - Dynamic column count

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API key |
| `EXPO_PUBLIC_YOUTUBE_API_KEY` | YouTube Data API key |
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | OpenRouter API key (optional) |
| `EXPO_PUBLIC_HUGGINGFACE_API_KEY` | HuggingFace API key (optional) |

## License

Private - Not for redistribution.
