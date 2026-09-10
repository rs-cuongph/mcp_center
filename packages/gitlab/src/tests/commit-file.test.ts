import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCommitFile } from "../tools/commit-file.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabCommit } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.commitFile = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_COMMIT: GitlabCommit = {
  id: "deadbeef00000000000000000000000000000000",
  shortId: "deadbee",
  title: "Update src/index.ts",
  authorName: "alice",
  authoredDate: "2026-09-01T00:00:00Z",
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/commit/deadbeef",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleCommitFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commits a file update and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.commitFile).mockResolvedValue(MOCK_COMMIT);

    const result = await handleCommitFile(
      {
        projectId: "mygroup/myproject",
        branch: "main",
        commitMessage: "Update index",
        action: "update",
        filePath: "src/index.ts",
        content: "export {};",
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.commitFile).toHaveBeenCalledWith("mygroup/myproject", {
      branch: "main",
      commitMessage: "Update index",
      action: "update",
      filePath: "src/index.ts",
      content: "export {};",
      encoding: undefined,
      startBranch: undefined,
    });
    expect(result.content[0].text).toContain("File updated");
    expect(result.content[0].text).toContain("src/index.ts");
    expect(result.content[0].text).toContain("deadbee");
  });

  it("commits a file delete without requiring content", async () => {
    vi.mocked(GitlabHttpClient.prototype.commitFile).mockResolvedValue(MOCK_COMMIT);

    const result = await handleCommitFile(
      { projectId: "42", branch: "main", commitMessage: "Remove file", action: "delete", filePath: "old.txt" },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.commitFile).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ action: "delete", content: undefined })
    );
  });

  it("creates an empty file when content is an empty string", async () => {
    vi.mocked(GitlabHttpClient.prototype.commitFile).mockResolvedValue(MOCK_COMMIT);

    const result = await handleCommitFile(
      { projectId: "42", branch: "main", commitMessage: "Add placeholder", action: "create", filePath: "empty.txt", content: "" },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.commitFile).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ action: "create", content: "" })
    );
  });

  it("rejects a create action without content", async () => {
    const result = await handleCommitFile(
      { projectId: "42", branch: "main", commitMessage: "Add file", action: "create", filePath: "new.txt" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("content is required");
    expect(GitlabHttpClient.prototype.commitFile).not.toHaveBeenCalled();
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.commitFile).mockRejectedValue(authRequired());

    const result = await handleCommitFile(
      { projectId: "42", branch: "main", commitMessage: "x", action: "create", filePath: "a.txt", content: "x" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });
});
