import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBasicAuthorizationHeader,
  loadAndValidateSession,
} from "../auth/session-manager.js";

const BASE_URL = "https://jira.example.com";
const VALIDATE_PATH = "/rest/api/2/myself";

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        get: vi.fn(),
      })),
      get: vi.fn(),
    },
  };
});

describe("createBasicAuthorizationHeader", () => {
  it("encodes username and password as base64 Basic auth header", () => {
    const header = createBasicAuthorizationHeader("user@example.com", "secret123");
    expect(header).toBe(`Basic ${Buffer.from("user@example.com:secret123").toString("base64")}`);
  });
});

describe("loadAndValidateSession", () => {
  beforeEach(() => {
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_PASSWORD;
    vi.clearAllMocks();
  });

  it("throws AUTH_REQUIRED when credentials are missing", async () => {
    await expect(loadAndValidateSession(BASE_URL, VALIDATE_PATH)).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });

    process.env.JIRA_EMAIL = "user@example.com";
    await expect(loadAndValidateSession(BASE_URL, VALIDATE_PATH)).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });

    delete process.env.JIRA_EMAIL;
    process.env.JIRA_PASSWORD = "secret";
    await expect(loadAndValidateSession(BASE_URL, VALIDATE_PATH)).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });
  });

  it("returns authorizationHeader and empty cookieHeader when credentials validate", async () => {
    process.env.JIRA_EMAIL = "user@example.com";
    process.env.JIRA_PASSWORD = "secret";

    const axiosMod = await import("axios");
    vi.mocked(axiosMod.default.get).mockResolvedValue({
      status: 200,
      data: { name: "test-user" },
    });

    const result = await loadAndValidateSession(BASE_URL, VALIDATE_PATH);

    expect(result).toEqual({
      cookieHeader: "",
      authorizationHeader: `Basic ${Buffer.from("user@example.com:secret").toString("base64")}`,
    });

    expect(vi.mocked(axiosMod.default.get)).toHaveBeenCalledWith(
      `${BASE_URL}${VALIDATE_PATH}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("user@example.com:secret").toString("base64")}`,
          Accept: "application/json",
        }),
        maxRedirects: 0,
      })
    );
  });

  it("throws SESSION_EXPIRED when Basic Auth returns 401", async () => {
    process.env.JIRA_EMAIL = "user@example.com";
    process.env.JIRA_PASSWORD = "wrong-password";

    const axiosMod = await import("axios");
    vi.mocked(axiosMod.default.get).mockRejectedValue(new Error("Request failed with status code 401"));

    await expect(loadAndValidateSession(BASE_URL, VALIDATE_PATH)).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
  });

  it("throws SESSION_EXPIRED when Jira returns a login page HTML redirect", async () => {
    process.env.JIRA_EMAIL = "user@example.com";
    process.env.JIRA_PASSWORD = "secret";

    const axiosMod = await import("axios");
    vi.mocked(axiosMod.default.get).mockResolvedValue({
      status: 200,
      data: "<html><head><title>Log In - Jira</title></head><body>login</body></html>",
    });

    await expect(loadAndValidateSession(BASE_URL, VALIDATE_PATH)).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
  });
});
