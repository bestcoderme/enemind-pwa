# ENEMIND Products API

A public, read-only API so other apps (websites, WhatsApp bots, Zapier/Make, mobile apps) can pull
**new published products** from ENEMIND, including image, price, product link and the WhatsApp order number.

## Deploy (once)

```powershell
supabase login
supabase link --project-ref cmkrpouruqkugxguewdf
supabase secrets set SITE_URL=https://bestcoderme.github.io/enemind-pwa/
supabase functions deploy enemind-products --no-verify-jwt
```

Optional secrets:
- `WHATSAPP_NUMBER` – defaults to `254180752220`
- `ENEMIND_API_KEY` – if set, every request must send it (see "Protecting the API")

## Endpoint

```
GET https://cmkrpouruqkugxguewdf.supabase.co/functions/v1/enemind-products
```

| Parameter  | Meaning                                                        | Default |
|------------|----------------------------------------------------------------|---------|
| `limit`    | 1–100 products                                                 | 20      |
| `since`    | only products created (or updated, with `sort=updated`) after this ISO date | – |
| `category` | category slug, e.g. `jobs-careers`                             | all     |
| `featured` | `true` for featured products only                              | all     |
| `id`       | one product by product code                                    | –       |
| `sort`     | `new` (newest created) or `updated`                            | `new`   |
| `format`   | `json` or `rss`                                                | `json`  |

### Examples

```bash
# 10 newest products
curl "https://cmkrpouruqkugxguewdf.supabase.co/functions/v1/enemind-products?limit=10"

# Only what is new since 1 Nov 2026
curl "…/enemind-products?since=2026-11-01"

# RSS feed (subscribe in any feed reader / automation tool)
curl "…/enemind-products?format=rss"
```

### Response

```json
{
  "source": "ENEMIND",
  "count": 1,
  "products": [
    {
      "id": "ENE-001",
      "title": "CV Starter Pack",
      "category": "Jobs & Careers",
      "short_description": "…",
      "price": 500,
      "currency": "KES",
      "image_url": "https://…/product-covers/….jpg",
      "product_url": "https://bestcoderme.github.io/enemind-pwa/?product=ENE-001",
      "whatsapp_number": "254180752220",
      "whatsapp_display": "+254 180 752 220",
      "whatsapp_order_url": "https://wa.me/254180752220?text=…",
      "created_at": "2026-11-02T10:00:00Z"
    }
  ]
}
```

## Protecting the API

By default anyone can read published products (they are already public on the website).
To restrict it to apps you trust:

```powershell
supabase secrets set ENEMIND_API_KEY=choose-a-long-random-value
```

Callers then send `x-api-key: choose-a-long-random-value`. Don't put this key in browser code you publish.

## Using it from another app

```js
const res = await fetch(
  "https://cmkrpouruqkugxguewdf.supabase.co/functions/v1/enemind-products?since=2026-11-01"
);
const { products } = await res.json();
```

Automation tools: use an **HTTP/Webhook GET** step with the URL above, or the RSS URL in an RSS trigger,
to post new products to Telegram, email, Google Sheets, etc.
