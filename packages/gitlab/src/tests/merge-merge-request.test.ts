import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMergeMergeRequest } from "../tools/merge-merge-request.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequest } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.mergeMergeRequest = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_MR: GitlabMergeRequest = {
  iid: 7,
  projectId: 42,
  title: "Add feature",
  description: "Details",
  state: "merged",
  draft: false,
  mergeStatus: "merged",
  hasConflicts: false,
  targetBranch: "main",
  sourceBranch: "feature/x",
  author: "alice",
  assignees: [],
  labels: [],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/merge_requests/7",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-02T00:00:00Z",
  mergedAt: "2026-09-02T00:00:00Z",
  closedAt: null,
  userNotesCount: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleMergeMergeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges a merge request and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.mergeMergeRequest).mockResolvedValue(MOCK_MR);

    const result = await handleMergeMergeRequest(
      {
        projectId: "mygroup/myproject",
        mergeRequestIid: 7,
        mergeCommitMessage: "Merge feature/x",
        squash: true,
        shouldRemoveSourceBranch: true,
        sha: "abc123",
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.mergeMergeRequest).toHaveBeenCalledWith("mygroup/myproject", 7, {
      mergeCommitMessage: "Merge feature/x",
      squash: true,
      shouldRemoveSourceBranch: true,
      mergeWhenPipelineSucceeds: undefined,
      sha: "abc123",
    });
    expect(result.content[0].text).toContain("!7 — merged");
    expect(result.content[0].text).toContain("2026-09-02T00:00:00Z");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.mergeMergeRequest).mockRejectedValue(authRequired());

    const result = await handleMergeMergeRequest({ projectId: "42", mergeRequestIid: 7 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects a missing mergeRequestIid", async () => {
    const result = await handleMergeMergeRequest({ projectId: "42" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.mergeMergeRequest).not.toHaveBeenCalled();
  });
});
