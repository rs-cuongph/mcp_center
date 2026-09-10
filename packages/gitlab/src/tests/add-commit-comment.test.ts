import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAddCommitComment } from "../tools/add-commit-comment.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabCommitComment } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.addCommitComment = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_COMMENT: GitlabCommitComment = {
  note: "Nice change!",
  path: "src/index.ts",
  line: 12,
  lineType: "new",
  author: "carol",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleAddCommitComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds an inline commit comment and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.addCommitComment).mockResolvedValue(MOCK_COMMENT);

    const result = await handleAddCommitComment(
      {
        projectId: "mygroup/myproject",
        sha: "abcdef1234567890",
        note: "Nice change!",
        path: "src/index.ts",
        line: 12,
        lineType: "new",
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.addCommitComment).toHaveBeenCalledWith(
      "mygroup/myproject",
      "abcdef1234567890",
      { note: "Nice change!", path: "src/index.ts", line: 12, lineType: "new" }
    );
    expect(result.content[0].text).toContain("Comment added to commit abcdef12");
    expect(result.content[0].text).toContain("src/index.ts:12");
    expect(result.content[0].text).toContain("Nice change!");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.addCommitComment).mockRejectedValue(authRequired());

    const result = await handleAddCommitComment(
      { projectId: "42", sha: "abc123", note: "hi" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects an empty note", async () => {
    const result = await handleAddCommitComment({ projectId: "42", sha: "abc123", note: "" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.addCommitComment).not.toHaveBeenCalled();
  });
});
