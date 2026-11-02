
import { supabase, supabaseConfigError } from "../supabaseClient";

function requireClient() {
  if (!supabase) throw new Error(supabaseConfigError);
  return supabase;
}

// Fetch all published products for the public ENEMIND store
export async function getProducts() {
  const { data, error } = await requireClient()
    .from("products")
    .select(`
      *,
      categories (
        name,
        slug
      )
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load ENEMIND products:", error);
    throw error;
  }

  return data ?? [];
}

// Fetch all active categories for the public ENEMIND store
export async function getCategories() {
  const { data, error } = await requireClient()
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Could not load ENEMIND categories:", error);
    throw error;
  }

  return data ?? [];
}
