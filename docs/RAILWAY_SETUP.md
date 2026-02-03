# Cherág - Complete Deployment Guide

> Full-stack deployment: FastAPI backend on Railway + React frontend on Cloudflare Pages

---

## 📋 Prerequisites

| Requirement | Sign Up |
|-------------|---------|
| GitHub account | [github.com](https://github.com) |
| Railway account | [railway.app](https://railway.app) |
| Cloudflare account | [cloudflare.com](https://cloudflare.com) |
| Supabase project | [supabase.com](https://supabase.com) |

### API Keys Needed

| Service | Get Key From |
|---------|--------------|
| Gemini | [Google AI Studio](https://aistudio.google.com/apikey) |
| DeepSeek | [DeepSeek Platform](https://platform.deepseek.com/api_keys) |
| OpenRouter | [OpenRouter Keys](https://openrouter.ai/keys) |
| YouTube Data API | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

---

# Part 1: Backend Deployment (Railway)

## Step 1.1: Get Supabase JWT Secret

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Settings** → **API**
3. Scroll to **JWT Settings**
4. Copy the **JWT Secret** (keep this safe!)

## Step 1.2: Push Code to GitHub

```powershell
cd c:\Users\HALA-MADRID\Desktop\Cherag

# Stage all new backend files
git add main.py requirements.txt Procfile
git add src/lib/aiService.ts
git add .env.example

# Commit
git commit -m "Add FastAPI backend for Railway deployment"

# Push
git push origin main
```

## Step 1.3: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your `Cherag` repository
5. Railway auto-detects the `Procfile` and starts building

## Step 1.4: Configure Environment Variables

In Railway → Your Project → **Variables** tab, add these:

```
SUPABASE_JWT_SECRET=your-jwt-secret-from-step-1
SUPABASE_URL=https://your-project.supabase.co
GEMINI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
YOUTUBE_API_KEY=AIza...
```

> ⚠️ **CRITICAL**: Do NOT use `VITE_` or `NEXT_PUBLIC_` prefixes here!

## Step 1.5: Get Your Railway URL

1. In Railway → Your Project → **Settings**
2. Under **Domains**, click **Generate Domain**
3. Copy the URL (e.g., `https://cherag-production.up.railway.app`)

## Step 1.6: Verify Backend

```powershell
# Test health endpoint
curl https://your-railway-url.up.railway.app/health

# Expected: {"status":"healthy","service":"cherag-backend"}
```

---

# Part 2: Connect Frontend to Backend

## Step 2.1: Update API Base URL

Edit `src/lib/aiService.ts` line 10:

```typescript
// Railway API Base URL
const API_BASE = 'https://cherag.up.railway.app';
```

## Step 2.2: Push Update

```powershell
git add src/lib/aiService.ts
git commit -m "Update API_BASE to Railway URL"
git push
```

---

# Part 3: Frontend Deployment (Cloudflare Pages)

## Step 3.1: Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Workers & Pages** → **Create application**
3. Select **Pages** → **Connect to Git**
4. Authorize GitHub and select your `Cherag` repository

## Step 3.2: Configure Build Settings

| Setting | Value |
|---------|-------|
| **Framework preset** | Vite |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (leave empty) |

## Step 3.3: Add Environment Variables

In Cloudflare → Your Project → **Settings** → **Environment variables**, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> ℹ️ These ARE prefixed with `VITE_` because they're for the frontend

## Step 3.4: Deploy

1. Click **Save and Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Your site is live at `https://cherag.pages.dev`

---

# Part 4: Update CORS (If Custom Domain)

If you use a custom domain (not `cherag.pages.dev`), update `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cherag.pages.dev",
        "https://your-custom-domain.com",  # Add this
        "http://localhost:5173"
    ],
    # ...
)
```

Then redeploy the backend.

---

# 🔄 Deployment Workflow (Ongoing)

```
┌─────────────┐     git push      ┌─────────────────┐
│  Local Dev  │ ─────────────────▶│     GitHub      │
└─────────────┘                   └────────┬────────┘
                                           │
                      ┌────────────────────┼────────────────────┐
                      ▼                                         ▼
             ┌────────────────┐                       ┌─────────────────┐
             │    Railway     │                       │  Cloudflare     │
             │  (Backend)     │                       │  Pages (Frontend│
             │                │                       │                 │
             │ Auto-deploys   │                       │  Auto-deploys   │
             │ main.py        │                       │  React app      │
             └────────────────┘                       └─────────────────┘
                      │                                         │
                      └──────────────┬──────────────────────────┘
                                     ▼
                            ┌────────────────┐
                            │   Production   │
                            │   cherag.app   │
                            └────────────────┘
```

---

# ✅ Verification Checklist

- [ ] Railway backend returns `{"status":"healthy"}` on `/health`
- [ ] Cloudflare Pages site loads without errors
- [ ] Can login/signup via Supabase auth
- [ ] AI features work (summary, flashcards, quiz, mindmap)
- [ ] No CORS errors in browser console

---

# 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| **401 Unauthorized** | Check `SUPABASE_JWT_SECRET` in Railway |
| **CORS Error** | Add your domain to `main.py` CORS origins |
| **Build Failed (Railway)** | Check `requirements.txt` has all deps |
| **Build Failed (Cloudflare)** | Ensure `VITE_` env vars are set |
| **AI returns errors** | Check API key balances/quotas |
| **"Network Error"** | Verify `API_BASE` URL in `aiService.ts` |

---

# 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `main.py` | FastAPI backend with all AI endpoints |
| `requirements.txt` | Python dependencies for Railway |
| `Procfile` | Railway startup command |
| `src/lib/aiService.ts` | Frontend → Backend API calls |
| `.env.example` | Template for environment variables |
