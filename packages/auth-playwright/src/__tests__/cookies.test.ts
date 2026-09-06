import { describe, it, expect } from "vitest";
import { extractMatchedCookies } from "../cookies.js";

describe("extractMatchedCookies", () => {
  it("keeps only cookies matching the base URL host and builds a header", () => {
    const session = { storageState: { cookies: [
      { name: "a", value: "1", domain: "jira.example.com", path: "/" },
      { name: "b", value: "2", domain: "other.com", path: "/" },
    ] } };
    const { cookieHeader, cookies } = extractMatchedCookies(session as never, "https://jira.example.com");
    expect(cookieHeader).toBe("a=1");
    expect(cookies).toHaveLength(1);
  });
});
