import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

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
