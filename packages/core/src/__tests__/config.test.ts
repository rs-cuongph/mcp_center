import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseEnv } from "../config.js";
import { isMcpError } from "../errors.js";

describe("parseEnv", () => {
  it("returns parsed data on valid env", () => {
    const schema = z.object({ FOO: z.string().min(1) });
    expect(parseEnv(schema, { FOO: "bar" } as NodeJS.ProcessEnv)).toEqual({ FOO: "bar" });
  });

  it("throws CONFIG_ERROR with field messages on invalid env", () => {
    const schema = z.object({ FOO: z.string().min(1) });
    try {
      parseEnv(schema, {} as NodeJS.ProcessEnv);
      throw new Error("should have thrown");
    } catch (e) {
      expect(isMcpError(e)).toBe(true);
      expect((e as { code: string }).code).toBe("CONFIG_ERROR");
      expect((e as Error).message).toContain("FOO");
    }
  });
});
