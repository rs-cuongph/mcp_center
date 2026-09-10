import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCreateBranch } from "../tools/create-branch.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabBranch } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.createBranch = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_BRANCH: GitlabBranch = {
  name: "feature/x",
  commitShortId: "abc1234",
  commitTitle: "Initial commit",
  committedDate: "2026-09-01T00:00:00Z",
  merged: false,
  protected: false,
  default: false,
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/tree/feature/x",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleCreateBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a branch and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.createBranch).mockResolvedValue(MOCK_BRANCH);

    const result = await handleCreateBranch(
      { projectId: "mygroup/myproject", branch: "feature/x", ref: "main" },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.createBranch).toHaveBeenCalledWith("mygroup/myproject", "feature/x", "main");
    expect(result.content[0].text).toContain("Branch created");
    expect(result.content[0].text).toContain("feature/x");
    expect(result.content[0].text).toContain("abc1234");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.createBranch).mockRejectedValue(authRequired());

    const result = await handleCreateBranch({ projectId: "42", branch: "feature/x", ref: "main" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects a missing ref", async () => {
    const result = await handleCreateBranch({ projectId: "42", branch: "feature/x" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.createBranch).not.toHaveBeenCalled();
  });
});
