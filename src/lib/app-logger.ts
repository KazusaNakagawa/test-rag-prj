import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type LogEntry = Record<string, unknown>;

const logDir = path.join(process.cwd(), "log");
const logFile = path.join(logDir, "app.log");

export async function appendAppLog(entry: LogEntry) {
  await mkdir(logDir, { recursive: true });
  const payload = {
    ts: new Date().toISOString(),
    ...entry,
  };
  await appendFile(logFile, `${JSON.stringify(payload)}\n`, "utf8");
}
