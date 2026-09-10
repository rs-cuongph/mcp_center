import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetMergeRequest } from "../tools/get-merge-request.js";
import { permissionDenied } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequest, GitlabDiscussion, GitlabMrChangeSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.getMergeRequest = vi.fn();
  MockGitlabHttpClient.prototype.getMergeRequestDiscussions = vi.fn();
  MockGitlabHttpClient.prototype.getMergeRequestChanges = vi.fn();
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
  iid: 5,
  projectId: 42,
  title: "Add login fix",
  description: "Fixes #12",
  state: "opened",
  draft: false,
  mergeStatus: "can_be_merged",
  hasConflicts: false,
  targetBranch: "main",
  sourceBranch: "fix-login",
  author: "alice",
  assignees: ["bob"],
  labels: ["bug"],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/merge_requests/5",
  createdAt: "2026-08-03T00:00:00Z",
  updatedAt: "2026-08-04T00:00:00Z",
  mergedAt: null,
  closedAt: null,
  userNotesCount: 1,
};

const MOCK_DISCUSSIONS: GitlabDiscussion[] = [
  { id: "d1", notes: [{ id: 1, body: "LGTM", author: "bob", createdAt: "2026-08-04T00:00:00Z", system: false }] },
];

const MOCK_CHANGES: GitlabMrChangeSummary[] = [
  { path: "src/login.ts", isNew: false, isRenamed: false, isDeleted: false, additions: 12, deletions: 3 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetMergeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the MR detail with changed-file stats and discussions", async () => {
    vi.mocked(GitlabHttpClient.prototype.getMergeRequest).mockResolvedValue(MOCK_MR);
    vi.mocked(GitlabHttpClient.prototype.getMergeRequestDiscussions).mockResolvedValue({
      items: MOCK_DISCUSSIONS,
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });
    vi.mocked(GitlabHttpClient.prototype.getMergeRequestChanges).mockResolvedValue(MOCK_CHANGES);

    const result = await handleGetMergeRequest({ projectId: "mygroup/myproject", iid: 5 }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Add login fix");
    expect(result.content[0].text).toContain("src/login.ts");
    expect(result.content[0].text).toContain("+12 / -3");
    expect(result.content[0].text).toContain("LGTM");
    // The compact summary embeds counts, never the raw unified diff text.
    expect(result.content[0].text).not.toContain("@@");
  });

  it("returns isError=true when the token lacks permission (403)", async () => {
    vi.mocked(GitlabHttpClient.prototype.getMergeRequest).mockRejectedValue(
      permissionDenied("https://devops.runsystem.info/api/v4/projects/42/merge_requests/5")
    );

    const result = await handleGetMergeRequest({ projectId: "mygroup/myproject", iid: 5 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("PERMISSION_DENIED");
  });
});
