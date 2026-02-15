# Cherág - Cloudflare Pages Deployment Guide

> **Goal:** Deploy the React Frontend to Cloudflare Pages.
> **Important:** This is for the **Frontend Only**. The backend runs on Railway.

---

## ✅ Prerequisites

1.  **Cloudflare Account**: [Sign up here](https://dash.cloudflare.com/sign-up) if you don't have one.
2.  **GitHub Repository**: Your code must be pushed to GitHub (which you have already done).

---

## 🚀 Step 1: Create Project

1.  Log in to the **Cloudflare Dashboard**.
2.  Go to **Workers & Pages** (on the left sidebar).
3.  Click the blue **Create application** button.
4.  Switch to the **Pages** tab.
5.  Click **Connect to Git**.
6.  **Authorize Cloudflare** to access your GitHub account if prompted.
7.  Select the **`cherag`** repository.
8.  Click **Begin setup**.

---

## ⚙️ Step 2: Configure Build Settings

Cloudflare usually detects these automatically, but double-check them:

*   **Project Name**: `cherag` (or whatever you prefer)
*   **Production Branch**: `main`
*   **Framework Preset**: `Vite` (Crucial!)
*   **Build Command**: `npm run build`
*   **Build Output Directory**: `dist`

---

## 🔐 Step 3: Environment Variables (Critical!)

This is where you define what keys the frontend can see.

**⚠️ IMPORTANT SECURITY NOTE:**
> **DELETE any old AI API keys** (like `VITE_GEMINI_API_KEY`, `VITE_OPENROUTER_API_KEY`) if you see them from a previous setup.
> The frontend **NO LONGER** communicates with AI directly. It sends requests to your Railway Backend.
> Keeping AI keys here is a **security risk**. Remove them!

**ONLY add these two variables:**

| Variable Name | Value |
|:---|:---|
| `VITE_SUPABASE_URL` | `https://<your-supabase-project>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(Your public anon key starting with eyJ...)* |
| `VITE_BACKEND_URL` | `https://<your-railway-app>.railway.app` |

1.  Click **Environment variables (advanced)** to expand the section.
2.  Add `VITE_SUPABASE_URL` and paste the value.
3.  Add `VITE_SUPABASE_ANON_KEY` and paste the value.
4.  Add `VITE_BACKEND_URL` and paste the Railway backend URL.

---

## 🚀 Step 4: Deploy

1.  Click **Save and Deploy**.
2.  Cloudflare will clone your repo, install dependencies, and build your site.
3.  This usually takes 1-2 minutes.

**Success!**
Once done, you will see a link like `https://cherag.pages.dev`.

---

## 🔄 Step 5: Handling Updates

*   Every time you `git push` to your `main` branch, Cloudflare will **automatically** rebuild and redeploy your site.
*   You don't need to do anything manually for updates!

---

## ❓ Troubleshooting

**"Page Not Found" (404) on refresh?**
*   This means the Single Page App (SPA) routing isn't working.
*   **Fix:** Ensure the `public/_redirects` file exists in your repository (we created this earlier!).

**"Network Error" when generating AI?**
*   This means the frontend can't reach the backend.
*   **Check:** Open the browser console (F12). If you see CORS errors, ensure your Cloudflare domain (e.g., `https://cherag.pages.dev`) is listed in `main.py` in the `allow_origins` list on Railway.
