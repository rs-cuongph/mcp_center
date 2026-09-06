import { describe, it, expect, vi } from "vitest";
import { runStdioServer } from "../server.js";

describe("runStdioServer", () => {
  it("registers tools and connects a transport", async () => {
    const register = vi.fn();
    // connect() writes to stdout; stub to avoid polluting the test runner.
    const writeSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await runStdioServer({ name: "test-mcp", version: "9.9.9", register });
    expect(register).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining("test-mcp"));
    writeSpy.mockRestore();
  });
});
