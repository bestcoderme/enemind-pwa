// ENEMIND public products API (read-only).
//
// GET /functions/v1/enemind-products
//   ?limit=20            1-100 (default 20)
//   &since=2026-11-01    only products created/updated after this ISO date
//   &category=jobs-careers   category slug
//   &featured=true       featured products only
//   &format=json|rss     json (default) or an RSS feed
//   &sort=new|updated    newest created (default) or recently updated first
//   &id=ENE-001          a single product by product_code
//
// Only PUBLISHED products are ever returned: the function uses the public
// anon key, so the database's row-level security enforces this.
//
// Optional protection: set a secret ENEMIND_API_KEY and callers must send it as
// header `x-api-key` (or ?api_key=...). Leave it unset for a fully public API.

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const API_KEY = Deno.env.get("ENEMIND_API_KEY") ?? "";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://bestcoderme.github.io/enemind-pwa/").replace(/\/?$/, "/");
const WHATSAPP_NUMBER = Deno.env.get("WHATSAPP_NUMBER") ?? "254180752220";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-api-key, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatWhatsApp(number: string) {
  const d = number.replace(/\D/g, "");
  return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`.trim();
}

// deno-lint-ignore no-explicit-any
function toItem(row: any) {
  const productUrl = `${SITE_URL}?product=${encodeURIComponent(row.product_code)}`;
  const orderText =
    `Hello ENEMIND. I would like to order ${row.title} (ID: ${row.product_code}).`;

  return {
    id: row.product_code,
    title: row.title,
    slug: row.slug,
    category: row.categories?.name ?? null,
    category_slug: row.categories?.slug ?? null,
    short_description: row.short_description,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    image_url: row.cover_image_url,
    is_featured: row.is_featured,
    product_url: productUrl,
    whatsapp_number: WHATSAPP_NUMBER,
    whatsapp_display: formatWhatsApp(WHATSAPP_NUMBER),
    whatsapp_order_url: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText)}`,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toRss(items: ReturnType<typeof toItem>[]) {
  const entries = items
    .map((item) => {
      const body = [
        item.short_description || item.description || "",
        `Price: ${item.currency} ${item.price}`,
        `Order on WhatsApp: ${item.whatsapp_display}`,
      ]
        .filter(Boolean)
        .join("\n");

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.product_url)}</link>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
      <pubDate>${new Date(item.created_at).toUTCString()}</pubDate>
      <category>${escapeXml(item.category ?? "General")}</category>
      <description>${escapeXml(body)}</description>${
        item.image_url
          ? `\n      <enclosure url="${escapeXml(item.image_url)}" type="image/jpeg" length="0" />`
          : ""
      }
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ENEMIND — New products</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>New ENEMIND digital products and resources.</description>
${entries}
  </channel>
</rss>`;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return json(405, { error: "Only GET is supported." });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: "API is not configured." });
  }

  const url = new URL(request.url);

  if (API_KEY) {
    const provided = request.headers.get("x-api-key") || url.searchParams.get("api_key");
    if (provided !== API_KEY) {
      return json(401, { error: "Missing or invalid API key." });
    }
  }

  const limitParam = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 100) : 20;
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const sort = url.searchParams.get("sort") === "updated" ? "updated_at" : "created_at";
  const since = url.searchParams.get("since");
  const categorySlug = url.searchParams.get("category");
  const productId = url.searchParams.get("id");
  const featured = url.searchParams.get("featured");

  if (since && Number.isNaN(Date.parse(since))) {
    return json(400, { error: "`since` must be a valid ISO date, e.g. 2026-11-01." });
  }
  if (!["json", "rss"].includes(format)) {
    return json(400, { error: "`format` must be json or rss." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // `categories!inner` is only needed when filtering by category slug.
  const select = categorySlug
    ? "*, categories!inner(name, slug)"
    : "*, categories(name, slug)";

  let query = supabase
    .from("products")
    .select(select)
    .eq("status", "published")
    .order(sort, { ascending: false })
    .limit(limit);

  if (since) query = query.gte(sort, new Date(since).toISOString());
  if (categorySlug) query = query.eq("categories.slug", categorySlug);
  if (featured === "true") query = query.eq("is_featured", true);
  if (productId) query = query.eq("product_code", productId);

  const { data, error } = await query;

  if (error) {
    console.error("enemind-products query failed:", error);
    return json(500, { error: "Could not load products." });
  }

  const items = (data ?? []).map(toItem);
  const cache = { "Cache-Control": "public, max-age=60, s-maxage=60" };

  if (format === "rss") {
    return new Response(toRss(items), {
      status: 200,
      headers: { ...corsHeaders, ...cache, "Content-Type": "application/rss+xml; charset=utf-8" },
    });
  }

  return json(
    200,
    {
      source: "ENEMIND",
      site_url: SITE_URL,
      generated_at: new Date().toISOString(),
      count: items.length,
      products: items,
    },
    cache,
  );
});
