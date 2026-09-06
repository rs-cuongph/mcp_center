import { describe, it, expect } from "vitest";
import { extractCookies } from "../auth/session-manager.js";
import type { SessionFile } from "../types.js";

const BASE_URL = "https://chatops.example.com";

function makeSession(cookies: Array<{ name: string; value: string; domain: string }>): SessionFile {
  return {
    savedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    storageState: {
      cookies: cookies.map((c) => ({
        ...c,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "Lax" as const,
      })),
      origins: [],
    },
  };
}

describe("extractCookies", () => {
  it("extracts cookies matching the base URL domain and captures MMCSRF as csrfToken", () => {
    const session = makeSession([
      { name: "MMAUTHTOKEN", value: "tok123", domain: "chatops.example.com" },
      { name: "MMUSERID", value: "usr456", domain: "chatops.example.com" },
      { name: "MMCSRF", value: "csrf789", domain: "chatops.example.com" },
    ]);

    const result = extractCookies(session, BASE_URL);
    expect(result.cookieHeader).toContain("MMAUTHTOKEN=tok123");
    expect(result.cookieHeader).toContain("MMUSERID=usr456");
    expect(result.cookieHeader).toContain("MMCSRF=csrf789");
    expect(result.csrfToken).toBe("csrf789");
  });

  it("returns undefined csrfToken when MMCSRF cookie is not present", () => {
    const session = makeSession([
      { name: "MMAUTHTOKEN", value: "tok123", domain: "chatops.example.com" },
    ]);

    const result = extractCookies(session, BASE_URL);
    expect(result.cookieHeader).toBe("MMAUTHTOKEN=tok123");
    expect(result.csrfToken).toBeUndefined();
  });

  it("ignores cookies from other domains", () => {
    const session = makeSession([
      { name: "MMAUTHTOKEN", value: "tok123", domain: "chatops.example.com" },
      { name: "OTHER", value: "val999", domain: "other.example.com" },
    ]);

    const result = extractCookies(session, BASE_URL);
    expect(result.cookieHeader).toBe("MMAUTHTOKEN=tok123");
    expect(result.cookieHeader).not.toContain("OTHER=val999");
  });
});
