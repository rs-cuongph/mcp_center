import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetCurrentUser } from "../tools/get-current-user.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.getCurrentUser = vi.fn();
  MockGitlabHttpClient.prototype.tryGetVersion = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the authenticated user and GitLab version when available", async () => {
    vi.mocked(GitlabHttpClient.prototype.getCurrentUser).mockResolvedValue({
      id: 7,
      username: "alice",
      name: "Alice Smith",
      state: "active",
      webUrl: "https://devops.runsystem.info/alice",
      email: "alice@example.com",
    });
    vi.mocked(GitlabHttpClient.prototype.tryGetVersion).mockResolvedValue({
      version: "17.3.1",
      revision: "abc123",
    });

    const result = await handleGetCurrentUser({}, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("alice");
    expect(result.content[0].text).toContain("17.3.1");
  });

  it("reports the version as unavailable without failing the whole call", async () => {
    vi.mocked(GitlabHttpClient.prototype.getCurrentUser).mockResolvedValue({
      id: 7,
      username: "alice",
      name: "Alice Smith",
      state: "active",
      webUrl: "https://devops.runsystem.info/alice",
      email: null,
    });
    vi.mocked(GitlabHttpClient.prototype.tryGetVersion).mockResolvedValue(null);

    const result = await handleGetCurrentUser({}, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("unavailable");
  });

  it("returns isError=true when the token is invalid (401)", async () => {
    vi.mocked(GitlabHttpClient.prototype.getCurrentUser).mockRejectedValue(authRequired());

    const result = await handleGetCurrentUser({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });
});
