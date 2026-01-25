import { requireUser } from "@/lib/supabase-server";

type ChatLogRow = {
  id: string;
  user_message: string;
  assistant_message: string;
  created_at: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chat_id");
  if (!chatId) {
    return Response.json(
      { messages: [], error: "chat_id is required." },
      { status: 400 }
    );
  }
  const auth = await requireUser(req);
  if ("error" in auth) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("chat_logs")
    .select("id, user_message, assistant_message, created_at")
    .eq("chat_id", chatId)
    .eq("user_id", auth.user.id)
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
