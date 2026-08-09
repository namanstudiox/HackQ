import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Browser-side Supabase client. Lazy singleton.
 *
 * If the env vars aren't configured yet (fresh clone), it still returns a
 * client so the build/SSG passes — auth calls will simply fail at runtime
 * until NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are set.
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!_client) {
    _client =
      url && key
        ? createBrowserClient(url, key)
        : createBrowserClient(
            "https://unconfigured.supabase.co",
            "public-anon-key-unconfigured"
          );
  }
  return _client;
}
