import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test config validation by manipulating process.env
// and re-importing the module via dynamic import.

vi.mock("dotenv", () => ({ config: vi.fn() }));

describe("config", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.JIRA_BASE_URL = "https://jira.example.com";
    process.env.JIRA_EMAIL = "user@example.com";
    process.env.JIRA_PASSWORD = "secret";
  });

  afterEach(() => {
    // Restore env after each test
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("parses valid configuration with defaults applied", async () => {
    const { config } = await import("../config.js");

    expect(config.JIRA_BASE_URL).toBe("https://jira.example.com");
    expect(config.JIRA_EMAIL).toBe("user@example.com");
    expect(config.JIRA_PASSWORD).toBe("secret");
    expect(config.JIRA_VALIDATE_PATH).toBe("/rest/api/2/myself");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("accepts overridden values", async () => {
    process.env.JIRA_BASE_URL = "https://jira.corp.net";
    process.env.LOG_LEVEL = "debug";

    const { config } = await import("../config.js");

    expect(config.LOG_LEVEL).toBe("debug");
    expect(config.JIRA_BASE_URL).toBe("https://jira.corp.net");
  });

  it("throws CONFIG_ERROR when JIRA_BASE_URL is missing", async () => {
    delete process.env.JIRA_BASE_URL;

    await expect(import("../config.js")).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
  });

  it("throws CONFIG_ERROR when JIRA_BASE_URL is not a valid URL", async () => {
    process.env.JIRA_BASE_URL = "not-a-url";

    await expect(import("../config.js")).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
  });

  it("throws CONFIG_ERROR when JIRA_EMAIL is missing", async () => {
    delete process.env.JIRA_EMAIL;

    await expect(import("../config.js")).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
  });

  it("throws CONFIG_ERROR when JIRA_PASSWORD is missing", async () => {
    delete process.env.JIRA_PASSWORD;

    await expect(import("../config.js")).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
  });

});
