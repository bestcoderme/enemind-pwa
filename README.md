# ENEMIND PWA

React + Vite app deployed to GitHub Pages at `/enemind-pwa/`.

## GitHub Pages setup
1. Repo **Settings → Pages → Source: GitHub Actions** (not "Deploy from a branch").
2. Add these repository secrets (Settings → Secrets and variables → Actions):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_FIREBASE_API_KEY`,
   `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
3. In Firebase Console → Authentication → Settings → Authorized domains, add `bestcoderme.github.io`.
4. Push to `main` to deploy.

## Local development
Copy `.env.example` to `.env`, fill in the values, then `npm install && npm run dev`.
