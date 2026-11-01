import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const ADMIN_EMAIL = "joicebarasa7@gmail.com";
const STORAGE_BUCKET = "product-covers";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FIREBASE_PROJECT_ID) {
  throw new Error("Missing required Edge Function environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function verifyFirebaseAdmin(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Missing Firebase sign-in token.");

  let payload;
  try {
    const verified = await jwtVerify(match[1], firebaseJwks, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    payload = verified.payload;
  } catch {
    throw new HttpError(401, "Your sign-in token is invalid or expired. Sign in again.");
  }

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (email !== ADMIN_EMAIL.toLowerCase() || payload.email_verified !== true) {
    throw new HttpError(403, "This Google account is not authorized to manage ENEMIND.");
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new HttpError(401, "The Firebase token has no valid user identifier.");
  }
}

function cleanText(value: unknown, field: string, maxLength: number, required = false) {
  if (typeof value !== "string") {
    if (required) throw new HttpError(400, `${field} is required.`);
    return "";
  }
  const cleaned = value.trim();
  if (required && !cleaned) throw new HttpError(400, `${field} is required.`);
  if (cleaned.length > maxLength) throw new HttpError(400, `${field} is too long.`);
  return cleaned;
}

function validateProduct(input: Record<string, unknown>) {
  const product_code = cleanText(input.product_code, "Product code", 80, true);
  const title = cleanText(input.title, "Product name", 200, true);
  const slug = cleanText(input.slug, "Product slug", 220, true);
  const category_id = cleanText(input.category_id, "Category", 100, true);
  const short_description = cleanText(input.short_description, "Short description", 500);
  const description = cleanText(input.description, "Description", 20000);
  const currency = cleanText(input.currency, "Currency", 3, true);
  const status = cleanText(input.status, "Status", 20, true);
  const price = Number(input.price);

  if (!/^[a-zA-Z0-9_-]+$/.test(product_code)) {
    throw new HttpError(400, "Product code may contain only letters, numbers, hyphens and underscores.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new HttpError(400, "Product slug must contain lowercase letters, numbers and single hyphens.");
  }
  if (!Number.isFinite(price) || price < 0 || price > 1000000000) {
    throw new HttpError(400, "Enter a valid product price.");
  }
  if (!new Set(["KES", "USD"]).has(currency)) {
    throw new HttpError(400, "Currency must be KES or USD.");
  }
  if (!new Set(["draft", "published", "archived"]).has(status)) {
    throw new HttpError(400, "Invalid product publication status.");
  }
  if (typeof input.is_featured !== "boolean") {
    throw new HttpError(400, "Featured status must be true or false.");
  }

  return {
    product_code,
    title,
    slug,
    category_id,
    short_description,
    description,
    price,
    currency,
    status,
    is_featured: input.is_featured,
  };
}

async function uploadCoverImage(file: File) {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new HttpError(400, "Cover image must be between 1 byte and 5 MB.");
  }

  const allowed = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);
  const extension = allowed.get(file.type);
  if (!extension) throw new HttpError(400, "Cover image must be JPG, PNG or WebP.");

  const path = `products/${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new HttpError(502, `Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

async function handleAction(action: string, payload: Record<string, unknown>, image?: File) {
  if (action === "products.list") {
    const [productsResult, categoriesResult] = await Promise.all([
      supabase.from("products").select("*, categories(name, slug)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    ]);
    if (productsResult.error) throw new HttpError(502, productsResult.error.message);
    if (categoriesResult.error) throw new HttpError(502, categoriesResult.error.message);
    return { products: productsResult.data ?? [], categories: categoriesResult.data ?? [] };
  }

  if (action === "products.save") {
    const product = validateProduct(payload);
    const id = payload.id ? cleanText(payload.id, "Product ID", 100, true) : "";
    const existingImageUrl = cleanText(payload.cover_image_url, "Cover image URL", 2000);
    let imagePath: string | null = null;
    let coverImageUrl = existingImageUrl || null;

    if (image) {
      const uploaded = await uploadCoverImage(image);
      imagePath = uploaded.path;
      coverImageUrl = uploaded.url;
    }

    const record = { ...product, cover_image_url: coverImageUrl, updated_at: new Date().toISOString() };
    const result = id
      ? await supabase.from("products").update(record).eq("id", id).select().single()
      : await supabase.from("products").insert(record).select().single();

    if (result.error) {
      if (imagePath) await supabase.storage.from(STORAGE_BUCKET).remove([imagePath]);
      throw new HttpError(502, result.error.message);
    }
    return result.data;
  }

  if (action === "products.archive") {
    const id = cleanText(payload.id, "Product ID", 100, true);
    const { data, error } = await supabase.from("products")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw new HttpError(502, error.message);
    return data;
  }

  throw new HttpError(400, "Unknown admin action.");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." });
  }

  try {
    await verifyFirebaseAdmin(request);

    let action = "";
    let payload: Record<string, unknown> = {};
    let image: File | undefined;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      action = String(form.get("action") || "");
      const rawPayload = String(form.get("payload") || "{}");
      try { payload = JSON.parse(rawPayload); } catch { throw new HttpError(400, "Invalid product data."); }
      const imageValue = form.get("image");
      if (imageValue instanceof File) image = imageValue;
    } else {
      const body = await request.json();
      action = typeof body.action === "string" ? body.action : "";
      payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    }

    const data = await handleAction(action, payload, image);
    return jsonResponse(200, { ok: true, data });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status === 500) console.error("ENEMIND admin function error:", error);
    return jsonResponse(status, { ok: false, error: message });
  }
});
