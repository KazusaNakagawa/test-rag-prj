import { requireUser } from "@/lib/supabase-server";

type ChatSessionRow = {
  id: string;
  title: string | null;
  updated_at: string | null;
};

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ sessions: [], error: error.message }, { status: 500 });
  }

  return Response.json({ sessions: (data ?? []) as ChatSessionRow[] });
}
