import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

type ChatLogRow = {
  id: string;
  user_message: string;
  assistant_message: string;
  created_at: string;
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
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chat_id");
  if (!chatId) {
    return Response.json(
      { messages: [], error: "chat_id is required." },
      { status: 400 }
    );
  }
  const userId = getUserId(req);
  if (!userId) {
    return Response.json(
      { messages: [], error: "x-user-id header is required." },
      { status: 400 }
    );
  }

  let supabaseUrl: string;
  let supabaseKey: string;

  try {
    supabaseUrl = requireEnv("SUPABASE_URL");
    supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  } catch {
    return Response.json({ messages: [] });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("chat_logs")
    .select("id, user_message, assistant_message, created_at")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return Response.json({ messages: [], error: error.message }, { status: 500 });
  }

  const logs = (data ?? []) as ChatLogRow[];
  const messages = logs.flatMap((row) => [
    {
      id: `${row.id}-user`,
      role: "user",
      parts: [{ type: "text", text: row.user_message }],
    },
    {
      id: `${row.id}-assistant`,
      role: "assistant",
      parts: [{ type: "text", text: row.assistant_message }],
    },
  ]);

  return Response.json({ messages });
}
