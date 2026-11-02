// Product sharing helpers for ENEMIND.
// One share sends: product image (as a file when the device allows it),
// the product details, the WhatsApp order number and a link back to the store.

export const WHATSAPP_NUMBER = "254180752220";

export function formatWhatsAppNumber(number = WHATSAPP_NUMBER) {
  // 254180752220 -> +254 180 752 220
  const digits = String(number).replace(/\D/g, "");
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`.trim();
}

export function whatsappOrderLink(text = "") {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// Clean link to a product: origin + path + ?product=CODE (no hash / stray params).
export function productUrl(product) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("product", product.id);
  return url.toString();
}

export function buildShareText(product, { includeImageUrl = false } = {}) {
  const lines = [
    `*${product.title}*`,
    product.category ? `Category: ${product.category}` : "",
    product.description ? `\n${product.description}` : "",
    `\nPrice: ${product.currency} ${product.price}`,
    `Product ID: ${product.id}`,
    "",
    `Order on WhatsApp: ${formatWhatsAppNumber()}`,
    whatsappOrderLink(`Hello ENEMIND. I would like to order ${product.title} (ID: ${product.id}).`),
    "",
    `View product: ${productUrl(product)}`,
  ];

  if (includeImageUrl && product.image) {
    lines.push(`Image: ${product.image}`);
  }

  return lines.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n").trim();
}

async function fetchImageFile(product) {
  if (!product.image) return null;

  try {
    const response = await fetch(product.image);
    if (!response.ok) return null;

    const blob = await response.blob();
    const type = blob.type || "image/jpeg";
    const ext = type.split("/")[1]?.split("+")[0] || "jpg";

    return new File([blob], `enemind-${product.id}.${ext}`, { type });
  } catch {
    // CORS or network problem: share without the file.
    return null;
  }
}

/**
 * Share a product using the device share sheet.
 * Returns "shared" | "copied" | "cancelled".
 */
export async function shareProduct(product) {
  const text = buildShareText(product);
  if (navigator.share) {
    const file = await fetchImageFile(product);

    // The product link is already inside `text`.
    const withFile = file ? { files: [file], title: product.title, text } : null;

    try {
      if (withFile && navigator.canShare?.(withFile)) {
        await navigator.share(withFile);
      } else {
        await navigator.share({ title: product.title, text });
      }
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
      // fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    window.prompt("Copy the product details:", text);
    return "copied";
  }
}

// Opens WhatsApp's own share screen with the product text (image link included,
// because WhatsApp cannot attach a file from a web link).
export function shareToWhatsApp(product) {
  const text = buildShareText(product, { includeImageUrl: true });
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

export async function copyProductDetails(product) {
  const text = buildShareText(product, { includeImageUrl: true });
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
