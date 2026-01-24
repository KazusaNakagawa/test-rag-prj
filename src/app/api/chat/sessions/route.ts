import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

type ChatSessionRow = {
  id: string;
  title: string | null;
  updated_at: string | null;
};

function getUserId(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId
    );
  return isUuid ? userId : null;
}

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) {
    return Response.json(
      { sessions: [], error: "x-user-id header is required." },
      { status: 400 }
    );
  }
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
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ sessions: [], error: error.message }, { status: 500 });
  }

  return Response.json({ sessions: (data ?? []) as ChatSessionRow[] });
}
