import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCreateMergeRequest } from "../tools/create-merge-request.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequest } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.createMergeRequest = vi.fn();
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
  state: "opened",
  draft: false,
  mergeStatus: "can_be_merged",
  hasConflicts: false,
  targetBranch: "main",
  sourceBranch: "feature/x",
  author: "alice",
  assignees: [],
  labels: ["feature"],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/merge_requests/7",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  mergedAt: null,
  closedAt: null,
  userNotesCount: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleCreateMergeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a merge request and formats the result, normalizing array labels to the client call", async () => {
    vi.mocked(GitlabHttpClient.prototype.createMergeRequest).mockResolvedValue(MOCK_MR);

    const result = await handleCreateMergeRequest(
      {
        projectId: "mygroup/myproject",
        sourceBranch: "feature/x",
        targetBranch: "main",
        title: "Add feature",
        description: "Details",
        assigneeIds: [1],
        reviewerIds: [2],
        labels: ["feature", "urgent"],
        removeSourceBranch: true,
        squash: true,
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.createMergeRequest).toHaveBeenCalledWith("mygroup/myproject", {
      sourceBranch: "feature/x",
      targetBranch: "main",
      title: "Add feature",
      description: "Details",
      assigneeIds: [1],
      reviewerIds: [2],
      labels: ["feature", "urgent"],
      removeSourceBranch: true,
      squash: true,
    });
    expect(result.content[0].text).toContain("Merge request created");
    expect(result.content[0].text).toContain("!7 Add feature");
    expect(result.content[0].text).toContain("feature/x → main");
  });

  it("normalizes a comma-separated labels string into an array before calling the client", async () => {
    vi.mocked(GitlabHttpClient.prototype.createMergeRequest).mockResolvedValue(MOCK_MR);

    await handleCreateMergeRequest(
      {
        projectId: "mygroup/myproject",
        sourceBranch: "feature/x",
        targetBranch: "main",
        title: "Add feature",
        labels: "feature, urgent",
      },
      MOCK_CFG
    );

    expect(GitlabHttpClient.prototype.createMergeRequest).toHaveBeenCalledWith(
      "mygroup/myproject",
      expect.objectContaining({ labels: ["feature", "urgent"] })
    );
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.createMergeRequest).mockRejectedValue(authRequired());

    const result = await handleCreateMergeRequest(
      { projectId: "42", sourceBranch: "feature/x", targetBranch: "main", title: "Add feature" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects a missing targetBranch", async () => {
    const result = await handleCreateMergeRequest(
      { projectId: "42", sourceBranch: "feature/x", title: "Add feature" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.createMergeRequest).not.toHaveBeenCalled();
  });
});
