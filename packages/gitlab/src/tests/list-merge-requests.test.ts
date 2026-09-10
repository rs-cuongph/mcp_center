import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListMergeRequests } from "../tools/list-merge-requests.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequestSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.listMergeRequests = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_MRS: GitlabMergeRequestSummary[] = [
  {
    iid: 5,
    projectId: 42,
    title: "Add login form",
    state: "opened",
    draft: true,
    mergeStatus: "can_be_merged",
    hasConflicts: false,
    targetBranch: "main",
    sourceBranch: "feature/login",
    author: "alice",
    assignees: ["bob"],
    labels: [],
    webUrl: "https://devops.runsystem.info/mygroup/myproject/-/merge_requests/5",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
    mergedAt: null,
    closedAt: null,
    userNotesCount: 0,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleListMergeRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a merge request table marking drafts", async () => {
    vi.mocked(GitlabHttpClient.prototype.listMergeRequests).mockResolvedValue({
      items: MOCK_MRS,
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    const result = await handleListMergeRequests({ projectId: "mygroup/myproject" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Add login form");
    expect(result.content[0].text).toContain("opened (draft)");
    expect(result.content[0].text).toContain("feature/login → main");
  });

  it("shows an empty-state message when no merge requests match", async () => {
    vi.mocked(GitlabHttpClient.prototype.listMergeRequests).mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 0 },
    });

    const result = await handleListMergeRequests({ projectId: "mygroup/myproject", state: "merged" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No merge requests found");
  });

  it("returns isError=true on HTTP error", async () => {
    vi.mocked(GitlabHttpClient.prototype.listMergeRequests).mockRejectedValue(
      gitlabHttpError(500, "https://devops.runsystem.info/api/v4/merge_requests")
    );

    const result = await handleListMergeRequests({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects an out-of-range perPage", async () => {
    const result = await handleListMergeRequests({ perPage: 500 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.listMergeRequests).not.toHaveBeenCalled();
  });
});
