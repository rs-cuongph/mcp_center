import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSession, writeSession, clearSession } from "../session-store.js";

describe("session-store round-trip", () => {
  it("writes, reads, and clears a session file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sess-"));
    const file = join(dir, "session.json");
    const session = { storageState: { cookies: [] } };

    expect(await readSession(file)).toBeNull();
    await writeSession(file, session as never);
    expect(await readSession(file)).toEqual(session);
    await clearSession(file);
    expect(await readSession(file)).toBeNull();
  });
});
