import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/**
 * Serve the local test markdown file for preview mode.
 */
export async function GET() {
  const filePath = path.join(process.cwd(), "test", "test.md");
  const markdown = await readFile(filePath, "utf-8");
  return new Response(markdown, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
