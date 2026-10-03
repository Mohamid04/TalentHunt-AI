# TalentHUNT AI

A career-assistant workspace built with React, TypeScript, Vite, Supabase Auth, browser-side resume parsing, and a clearly labelled sample job dataset.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and public publishable/anon key.
3. Start the app with `npm run dev`.

Without Supabase environment values, authentication is unavailable. The app offers a separate sample-only demo; it does not pretend to authenticate users.

## Configure Supabase Auth

1. Create a Supabase project. In **Project Settings → API**, copy the Project URL and publishable key (or legacy anon key) into `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. In **Authentication → Providers**, enable Email. Set your email confirmation and password policies for your project.
3. Add your local URL (normally `http://localhost:5173`) and production URL under **Authentication → URL Configuration**. Configure redirect URLs for both.
4. To enable Google sign-in, configure the Google OAuth provider in Supabase and add its callback URL to your Google OAuth client. The app displays provider/configuration errors returned by Supabase.
5. Restart Vite after changing `.env.local`.
6. Link the Supabase CLI to your project, apply the database migration with `supabase db push`, and deploy the authenticated functions with `supabase functions deploy parse-legacy-doc`, `supabase functions deploy analyze-resume`, `supabase functions deploy analyze-job-description`, and `supabase functions deploy ai-career`.
7. To enable optional AI analysis, set `OPENAI_API_KEY` as a Supabase Edge Function secret in the Supabase Dashboard. It must never be a `VITE_` variable. The analyzer uses `gpt-4o-mini` server-side.

The migrations in `supabase/migrations/` create the PostgreSQL career data model, timestamps, indexes, ownership policies, admin policies, and a private `resumes` Storage bucket. Resume object paths must begin with the authenticated user's UUID. The `public.users` row mirrors `auth.users`; authentication remains managed by Supabase Auth. Set an account's `public.users.role` to `admin` from a trusted SQL migration or server-side admin workflow, never from the browser.

All secure AI capabilities are exposed through the `ai-career` Edge Function and the browser-side `src/lib/aiService.ts` client. The shared server module in `supabase/functions/_shared/ai.ts` reads `AI_API_KEY` or the legacy `OPENAI_API_KEY` only from Edge Function secrets and calls an OpenAI-compatible provider selected by `AI_PROVIDER`, `AI_BASE_URL`, and `AI_MODEL`. Resume parsing, analysis, skill extraction, matching, gap analysis, roadmaps, resume improvements, cover letters, interview questions, and mock-interview feedback are represented as separate service tasks. The unified endpoint applies an authenticated per-user request limit.

The app uses Supabase Auth sessions for protected account access, email/password sign-up and login, email password recovery, Google OAuth, profile metadata updates, and logout. The dashboard is not shown to an unauthenticated account when Supabase is configured. Only the public key belongs in this browser app—never put a service-role key in a `VITE_` variable.

## Current workflow

- Upload a PDF, DOC, DOCX, or TXT resume, or paste resume text. PDF/DOCX/TXT extraction and keyword analysis run in the browser. Legacy DOC extraction requires the authenticated Edge Function; the file is processed transiently and is not stored. Resume text is held in memory only after parsing.
- Optional AI resume analysis requires the authenticated `analyze-resume` function and an `OPENAI_API_KEY` Edge Function secret. The user must opt in before resume text is sent to the configured AI provider; this app does not retain the provider request.
- Review detected name, contact, education, categorized technical skills, experience, internships, projects, certifications, achievements, and career-interest lines.
- Review an ATS compatibility estimate with document-structure checks, missing role keywords, weak sections, text-level formatting warnings, skill/experience relevance, and suggestions that never ask the user to claim unverified qualifications.
- Explore sample job matches with a weighted explanation across relevant skills, technologies, experience, education, title, location, salary, employment type, work arrangement, and career interests. Update those preferences in the profile.
- Search sample jobs by title, location, work arrangement, experience level, salary range, skills, employment type, and date posted. Cards label platform-catalog samples separately from externally attributed sample-feed records; Apply records a status and does not submit an application unless a real HTTPS apply URL is configured.
- Paste or upload a PDF, DOCX, or TXT job description for a local resume comparison. Signed-in users may separately opt in to send both texts to the configured provider through the authenticated `analyze-job-description` function.
- Review a learning roadmap, generate editable resume and cover-letter drafts, practice interview prompts, and track applications.
- Profile and application metadata are stored per account in this browser's local storage; profile edits are also saved to Supabase Auth user metadata when signed in.

## Important limitations

- Legacy `.doc` files and generative-AI analysis require deployed Edge Functions; the latter also requires a provider secret. Without those, convert DOC files to DOCX/PDF and use the local heuristic analysis. Scanned/image-only PDFs require OCR.
- ATS and job-fit percentages are local estimates, not scores from a particular ATS vendor or hiring predictions. The text parser cannot inspect visual PDF/DOCX layout.
- Job listings are fixtures, and skill-gap, roadmap, and interview coaching content is illustrative—not live job data or dynamically generated AI advice. Matching percentages are estimates, not hiring predictions.
- Job-search filters operate over included sample records until a live, licensed job data source is connected. Job-description AI requires its Edge Function deployment and the same server-side provider secret.
- Supabase project credentials and provider secrets are not included. Do not treat demo outputs as professional or hiring advice.

## Validate

- `npm run build` — TypeScript checks and production Vite build.
- `npm run lint` — Oxlint.