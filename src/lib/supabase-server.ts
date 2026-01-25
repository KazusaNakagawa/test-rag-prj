import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

/**
 * Extract the bearer token from an Authorization header.
 */
export function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

/**
 * Create a Supabase client authenticated with the provided bearer token.
 */
export function createSupabaseServerClient(token: string) {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Validate the request auth header and return the Supabase client + user.
 */
export async function requireUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      error: Response.json({ error: "Authorization token is required." }, { status: 401 }),
    };
  }

  const supabase = createSupabaseServerClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return {
      error: Response.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  return { supabase, user: data.user };
}
