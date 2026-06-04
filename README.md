# InterviewAI

Mock interview practice app I built to help people prep for tech and HR interviews. You answer questions via text, voice, or video and get AI feedback on your response.

Live: https://interviewai-swart.vercel.app

---

## How it works

Choose a mode (Technical, HR, or Case Study), pick a question, and answer however you want — type it out, speak it, or use your webcam. The app sends your answer to Groq (Llama 3.3 70B) and gets back a score breakdown: accuracy, clarity, depth, confidence. Sessions are saved so you can see how you're improving over time.

There's also a peer rooms feature where two people can practice together with turn-based mode and an observer mode.

---

## Stack

- Next.js 14 + React 18
- Groq API (Llama 3.3 70B) — AI feedback
- Supabase — auth + session storage
- Recharts — progress charts
- Vercel — hosting

---

## Running locally

You'll need a Groq API key (free at console.groq.com) and a Supabase project.

```bash
git clone https://github.com/Raunack/interviewai.git
cd interviewai
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your keys (see `.env.example` for what's needed), then:

```bash
npm run dev
```

For the database, paste `supabase-schema.sql` into the Supabase SQL editor and run it.

---

## Deployment

Full deployment steps (Vercel, Supabase, custom domain) are in [DEPLOYEMENT.md](./DEPLOYEMENT.md).
