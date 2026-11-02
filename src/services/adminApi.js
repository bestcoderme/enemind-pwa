import { auth } from "../firebase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/enemind-admin`;

/**
 * Calls the ENEMIND admin Edge Function using the current Firebase ID token.
 * The Supabase service-role key is never used or exposed in this file.
 */
export async function adminApi(action, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase URL or publishable key in your .env file.");
  }

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error("Please sign in with your Google account again.");
  }

  const idToken = await currentUser.getIdToken();
  let body;
  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${idToken}`,
  };

  if (options.image instanceof File) {
    body = new FormData();
    body.append("action", action);
    body.append("payload", JSON.stringify(options.payload ?? {}));
    body.append("image", options.image, options.image.name);
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ action, ...(options.payload ? { payload: options.payload } : {}) });
  }

  let response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers,
      body,
    });
  } catch (error) {
    throw new Error(`Could not reach the ENEMIND admin service: ${error.message}`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Admin service returned an unreadable response (HTTP ${response.status}).`);
  }

  if (!response.ok || result?.ok !== true) {
    throw new Error(result?.error || `Admin request failed (HTTP ${response.status}).`);
  }

  return result.data;
}
