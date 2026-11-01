# ENEMIND secure admin deployment

This package moves admin product listing, create/update, archive, and product-cover uploads behind a Supabase Edge Function. The function verifies Firebase ID tokens and permits only `joicebarasa7@gmail.com` from Firebase project `enemind-992f5`.

## Files to copy into the existing Vite project

Copy these paths, preserving the folder structure:

- `src/components/AdminDashboard.jsx`
- `src/services/adminApi.js`
- `supabase/config.toml`
- `supabase/functions/enemind-admin/index.ts`

`App.jsx`, `firebase.js`, and `supabaseClient.js` do not need to be replaced for this change.

## 1. Supabase Storage bucket

In Supabase Dashboard, open Storage and create a bucket named exactly `product-covers`.

- Set the bucket to **Public** so storefront visitors can view cover images.
- Do not create anonymous/authenticated INSERT, UPDATE, or DELETE policies. The Edge Function uploads using the server-side service-role key.
- This bucket is only for product cover images. Actual downloadable product files remain in private Google Drive.

## 2. Confirm frontend environment variables

The existing frontend must have these Vite variables in its `.env` file:

```env
VITE_SUPABASE_URL=https://cmkrpouruqkugxguewdf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=enemind-992f5
VITE_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

Use the actual existing values from your project. Never put a Supabase service-role key in a `VITE_` variable or any frontend file.

## 3. Deploy the Edge Function

Open PowerShell in the root of the existing Vite project (the folder containing `package.json`). Confirm the Supabase CLI is installed, then run:

```powershell
supabase login
supabase link --project-ref cmkrpouruqkugxguewdf
supabase secrets set FIREBASE_PROJECT_ID=enemind-992f5
supabase functions deploy enemind-admin --no-verify-jwt
```

The `--no-verify-jwt` flag is intentional: Supabase's gateway must not try to validate the Firebase token as a Supabase JWT. The function itself verifies the Firebase signature, issuer, audience, verified email, and exact admin email before doing anything. Keep `verify_jwt = false` in `supabase/config.toml`.

Supabase Edge Functions provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime. The service-role key is used only inside the function and must never be copied into the Vite `.env` file.

## 4. Build and test

After copying the files and deploying the function:

```powershell
npm run build
npm run dev
```

Sign in using the Google account `joicebarasa7@gmail.com`, open Admin Dashboard, and test in this order:

1. Refresh the product list.
2. Create a draft product without an image.
3. Edit that product and upload a JPG, PNG, or WebP cover image (maximum 5 MB).
4. Publish it, then archive it.

A different Google account must receive HTTP 403 from the admin function. An expired or invalid Firebase token must receive HTTP 401.

## Important notes

- The Edge Function uses the existing `products` and `categories` tables and their existing column names.
- It expects `product-covers` to exist before cover uploads.
- Public storefront product reads are not moved by this package; the existing public product service remains separate.
- The function never accepts a caller-supplied admin email as proof of authorization. It derives the email from the verified Firebase token.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in React, `.env` variables prefixed with `VITE_`, GitHub, or browser code.
