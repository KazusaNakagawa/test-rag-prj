import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

type ChatSessionRow = {
  id: string;
  title: string | null;
  updated_at: string | null;
};

export async function GET() {
  let supabaseUrl: string;
  let supabaseKey: string;

  try {
    supabaseUrl = requireEnv("SUPABASE_URL");
    supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  } catch {
    return Response.json({ sessions: [] });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ sessions: [], error: error.message }, { status: 500 });
  }

  return Response.json({ sessions: (data ?? []) as ChatSessionRow[] });
}
