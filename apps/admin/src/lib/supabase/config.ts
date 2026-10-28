export function getSupabaseConfig() {
  // Static property access is required for Next.js public variable substitution.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Configurazione Supabase Admin incompleta.");
  }
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("URL Supabase Admin non valido.");
  }
  return { url, publishableKey };
}

export const ADMIN_COOKIE_OPTIONS = {
  name: "bacheca-admin-auth-token",
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;
