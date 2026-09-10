import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleUpdateMergeRequest } from "../tools/update-merge-request.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequest } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.updateMergeRequest = vi.fn();
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
  title: "Add feature (updated)",
  description: "Details",
  state: "closed",
  draft: false,
  mergeStatus: "cannot_be_merged",
  hasConflicts: false,
  targetBranch: "develop",
  sourceBranch: "feature/x",
  author: "alice",
  assignees: [],
  labels: ["feature", "reviewed"],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/merge_requests/7",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-02T00:00:00Z",
  mergedAt: null,
  closedAt: "2026-09-02T00:00:00Z",
  userNotesCount: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleUpdateMergeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a merge request and formats the result, normalizing label fields to the client call", async () => {
    vi.mocked(GitlabHttpClient.prototype.updateMergeRequest).mockResolvedValue(MOCK_MR);

    const result = await handleUpdateMergeRequest(
      {
        projectId: "mygroup/myproject",
        mergeRequestIid: 7,
        title: "Add feature (updated)",
        targetBranch: "develop",
        stateEvent: "close",
        addLabels: "reviewed",
        removeLabels: ["stale"],
        assigneeIds: [3],
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.updateMergeRequest).toHaveBeenCalledWith("mygroup/myproject", 7, {
      title: "Add feature (updated)",
      description: undefined,
      targetBranch: "develop",
      stateEvent: "close",
      labels: undefined,
      addLabels: ["reviewed"],
      removeLabels: ["stale"],
      assigneeIds: [3],
    });
    expect(result.content[0].text).toContain("Merge request updated");
    expect(result.content[0].text).toContain("!7 Add feature (updated)");
    expect(result.content[0].text).toContain("closed");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.updateMergeRequest).mockRejectedValue(authRequired());

    const result = await handleUpdateMergeRequest(
      { projectId: "42", mergeRequestIid: 7, title: "x" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects an invalid stateEvent", async () => {
    const result = await handleUpdateMergeRequest(
      { projectId: "42", mergeRequestIid: 7, stateEvent: "archive" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.updateMergeRequest).not.toHaveBeenCalled();
  });
});
