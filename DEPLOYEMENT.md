# MockPrep — Complete Deployment Guide

## Your Tech Stack
| What | Tool | Cost |
|------|------|------|
| Frontend | Vercel | Free |
| AI Feedback | Groq (Llama 3.3 70B) | Free |
| Database | Supabase | Free (500MB) |
| Domain | Namecheap .me | Free (GitHub Edu) |
| Server Credits | DigitalOcean | $200 free (GitHub Edu) |
| Repo | GitHub Private | Free |

---

## Step 1: Set Up Supabase (Database)

1. Go to **supabase.com** → Sign up free with GitHub
2. Click **"New Project"** → name it `interviewai` → set a DB password → pick closest region (Singapore for India)
3. Wait ~2 minutes for project to spin up
4. Go to **SQL Editor** (left sidebar) → paste the entire contents of `supabase-schema.sql` → click **Run**
5. Go to **Project Settings → API** → copy:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **service_role key** (scroll down, click Reveal) — keep this secret!

---

## Step 2: Get Your Groq API Key

1. Go to **console.groq.com** → Sign up free (no credit card)
2. Click **"API Keys"** in the left menu → **"Create API Key"**
3. Copy the key — it starts with `gsk_`

---

## Step 3: Push to Private GitHub Repo

```bash
# In your project folder:
git init
git add .
git commit -m "Initial MockPrep app"

# Create a NEW private repo at github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/interviewai.git
git branch -M main
git push -u origin main
```

> **Important:** Never commit your `.env.local` file — it's in `.gitignore` already.

---

## Step 4: Deploy to Vercel

1. Go to **vercel.com** → Sign up / log in with GitHub
2. Click **"Add New Project"** → **"Import Git Repository"**
3. Authorize Vercel to access **only your `interviewai` repo** (not all repos)
4. Click **Import** → then click **"Environment Variables"** before deploying
5. Add these 3 variables:

| Name | Value |
|------|-------|
| `GROQ_API_KEY` | `gsk_your_key_here` |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `your_service_role_key` |

6. Click **Deploy** — live in ~30 seconds!

---

## Step 5: Connect Your Namecheap Domain (GitHub Edu)

### Get the free domain:
1. Go to **education.github.com/pack** → find Namecheap → click "Get access"
2. You'll get a free `.me` domain for 1 year + SSL

### Point it to Vercel:
1. In Namecheap dashboard → **Manage** your domain → **Advanced DNS**
2. Add a CNAME record:
   - Host: `www`
   - Value: `cname.vercel-dns.com`
3. Add an A record:
   - Host: `@`
   - Value: `76.76.21.21` (Vercel's IP)
4. In **Vercel dashboard** → your project → **Settings → Domains**
5. Add your domain (e.g., `yourname.me`) → Vercel will auto-configure SSL

---

## Step 6: Local Development (Optional)

```bash
# Install Vercel CLI
npm install -g vercel

# Create .env.local with your keys (copy from .env.example)
cp .env.example .env.local
# Fill in your actual keys in .env.local

# Run locally (API routes work too)
vercel dev
# Visit http://localhost:3000
```

---

## API Routes Reference

| Route | Method | What it does |
|-------|--------|-------------|
| `/api/feedback` | POST | Sends answer to Groq, returns AI feedback |
| `/api/save-session` | POST | Saves session to Supabase |
| `/api/get-history` | GET | Fetches session history from Supabase |

### Example: Connect frontend to backend API
In `index.html`, replace the direct Groq fetch with:
```javascript
const res = await fetch('/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question, answer, mode: currentMode })
});
const { feedback } = await res.json();
```
This hides your Groq API key from the browser entirely.

---

## Connecting Supabase to Frontend

After submitting an answer, also call:
```javascript
await fetch('/api/save-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: currentMode, question, answer,
    score: fb.score, accuracy: fb.accuracy,
    clarity: fb.clarity, depth: fb.depth,
    confidence: fb.confidence, feedback: fb.feedback,
    improvement: fb.improvement
  })
});
```

Load history on page load:
```javascript
const { sessions, stats } = await (await fetch('/api/get-history')).json();
// Render sessions in history panel
```

---

## DigitalOcean (GitHub Edu — $200 credit)

You don't strictly need DigitalOcean since Vercel handles serverless functions for free.
But if you want a full Node.js backend later (e.g., WebSocket for real-time features):

1. Go to **digitalocean.com** → connect via GitHub Edu
2. Create a **Droplet** → choose Ubuntu 24 → Basic plan ($6/mo, your credits cover it)
3. SSH in, install Node.js, deploy your backend
4. Point your API subdomain (e.g., `api.yourname.me`) to the Droplet IP

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + Enter` | Submit answer |
| `Alt + →` | Next question |
| `Alt + S` | Shuffle question |

---

## Features Built In

- ✅ 3 interview modes (Technical, HR, Case Study)
- ✅ 8 questions per mode (24 total)
- ✅ Text / Voice / Video+Voice input modes
- ✅ Live captions (Web Speech API)
- ✅ Read-aloud questions (TTS, en-IN voice)
- ✅ High contrast + large text accessibility modes
- ✅ Full keyboard navigation + ARIA labels
- ✅ AI feedback: score, accuracy, clarity, depth, confidence
- ✅ Session history (localStorage fallback + Supabase)
- ✅ Webcam with posture/eye-contact badges
- ✅ Shuffle questions randomly
- ✅ Session stats (questions answered, avg score)

---

## Next Features to Add

- [ ] User authentication (Supabase Auth)
- [ ] Resume upload → auto-generate personalized questions
- [ ] Progress charts over time (Chart.js or Recharts)
- [ ] Filler word detection ("um", "uh") in voice mode
- [ ] Speaking pace analysis
- [ ] Export session report as PDF
- [ ] Share session link with mentor
