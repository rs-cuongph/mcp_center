import fs from "node:fs/promises";
import path from "node:path";
import type { SessionFile } from "./types.js";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Reads and parses the persisted Playwright storage state file.
 * Returns null if the file does not exist.
 * Throws if the file exists but cannot be parsed.
 */
export async function readSession(filePath: string): Promise<SessionFile | null> {
  const resolved = path.resolve(filePath);
  try {
    const raw = await fs.readFile(resolved, "utf-8");
    return JSON.parse(raw) as SessionFile;
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Persists a SessionFile to disk.
 * Creates the directory if it does not exist.
 */
export async function writeSession(filePath: string, session: SessionFile): Promise<void> {
  const resolved = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(session, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------

/**
 * Removes the session file.
 * Silently succeeds if it does not exist.
 */
export async function clearSession(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  try {
    await fs.unlink(resolved);
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") return;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Internal util
// ---------------------------------------------------------------------------

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
