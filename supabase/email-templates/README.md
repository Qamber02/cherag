# 📧 Cherág Email Templates Suite

Professional, dark-mode-first, fully responsive transactional HTML email templates tailored for Cherág.

---

## 📂 Included Templates

| File | Template Type | Supabase Auth Event | Key Features |
|---|---|---|---|
| [`verification.html`](verification.html) | Confirm Signup | New Registration | Vibrant logo badge, CTA button, fallback link, feature highlights preview |
| [`password-reset.html`](password-reset.html) | Reset Password | Password Reset | Security warning banner (60-min expiry), clear CTA button, fallback link |
| [`magic-link.html`](magic-link.html) | Magic Link / OTP | Passwordless Login | Amber/gold accent, 15-minute expiry notice, single-use security badge |
| [`email-change.html`](email-change.html) | Change Email | Email Update | Teal/cyan security theme, confirmation link, zero-action safety note |
| [`invite-user.html`](invite-user.html) | User Invite | Team / Study Group | Emerald theme, active recall invitation card |
| [`welcome.html`](welcome.html) | Welcome Onboarding | Post-Verification | Quick 3-step feature quickstart guide, CTA to Cherág App Dashboard |

---

## 🛠️ How to Apply in Supabase Dashboard

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your Cherág Project (`rdlrmkpircequotldjen`).
3. Navigate to **Authentication** &rarr; **Email Templates**.
4. Copy the raw HTML from each template file above into its corresponding tab:
   - **Confirm signup**: paste content of [`verification.html`](verification.html)
   - **Reset password**: paste content of [`password-reset.html`](password-reset.html)
   - **Magic link**: paste content of [`magic-link.html`](magic-link.html)
   - **Change email address**: paste content of [`email-change.html`](email-change.html)
   - **User invite**: paste content of [`invite-user.html`](invite-user.html)
5. Click **Save** for each tab.

---

## 🎨 Design System Specs

- **Primary Outer Background**: `#09090b` (Rich dark slate)
- **Card Background**: `#121218` (Glassmorphism dark container with 1px border)
- **Top Accent Line**: 4px vibrant linear gradient (Indigo / Rose / Amber / Teal / Emerald)
- **Typography**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Branding**: Official Cherág high-resolution logo from Supabase Storage
- **Mobile Compatibility**: Fully fluid tables using standard `cellspacing="0"`, `cellpadding="0"`, `role="presentation"` tested across Apple Mail, Gmail, Outlook, and webmail clients.
