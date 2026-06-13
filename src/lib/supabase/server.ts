/**
 * Server-side Supabase client — uses the SERVICE ROLE key.
 *
 * IMPORTANT: Only import this from:
 *   - Server Actions  (`'use server'` files)
 *   - Route Handlers  (app/api/*)
 *   - Server Components
 *
 * Never import it from client components — the service role key
 * bypasses all Row Level Security and must never reach the browser.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and " +
    "SUPABASE_SERVICE_ROLE_KEY to .env.local"
  );
}

// One shared instance per server process — createClient is cheap but
// there's no benefit in making a new one on every request.
export const db = createClient<Database>(url, key, {
  auth: { persistSession: false },
});
