import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleDeleteBranch } from "../tools/delete-branch.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.deleteBranch = vi.fn();
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

describe("handleDeleteBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a branch and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.deleteBranch).mockResolvedValue(undefined);

    const result = await handleDeleteBranch({ projectId: "mygroup/myproject", branch: "feature/x" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.deleteBranch).toHaveBeenCalledWith("mygroup/myproject", "feature/x");
    expect(result.content[0].text).toContain("Branch deleted");
    expect(result.content[0].text).toContain("feature/x");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.deleteBranch).mockRejectedValue(authRequired());

    const result = await handleDeleteBranch({ projectId: "42", branch: "feature/x" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects a missing branch", async () => {
    const result = await handleDeleteBranch({ projectId: "42" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.deleteBranch).not.toHaveBeenCalled();
  });
});
