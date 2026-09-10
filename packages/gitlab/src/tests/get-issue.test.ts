import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetIssue } from "../tools/get-issue.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabIssue, GitlabNote } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.getIssue = vi.fn();
  MockGitlabHttpClient.prototype.getIssueNotes = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_ISSUE: GitlabIssue = {
  iid: 12,
  projectId: 42,
  title: "Fix login bug",
  description: "Steps to reproduce the bug",
  state: "opened",
  labels: ["bug"],
  milestone: null,
  author: "alice",
  assignees: ["bob"],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/issues/12",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z",
  closedAt: null,
  dueDate: null,
  confidential: false,
  userNotesCount: 1,
};

const MOCK_NOTES: GitlabNote[] = [
  { id: 1, body: "Confirmed the bug", author: "bob", createdAt: "2026-08-01T12:00:00Z", system: false },
  { id: 2, body: "changed the description", author: "bob", createdAt: "2026-08-01T12:05:00Z", system: true },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the issue detail and excludes system notes from the visible count", async () => {
    vi.mocked(GitlabHttpClient.prototype.getIssue).mockResolvedValue(MOCK_ISSUE);
    vi.mocked(GitlabHttpClient.prototype.getIssueNotes).mockResolvedValue({
      items: MOCK_NOTES,
      meta: { page: 1, perPage: 20, total: 2, totalPages: 1 },
    });

    const result = await handleGetIssue({ projectId: "mygroup/myproject", iid: 12 }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Fix login bug");
    expect(result.content[0].text).toContain("Notes (1 of 2)");
    expect(result.content[0].text).toContain("Confirmed the bug");
    expect(result.content[0].text).not.toContain("changed the description");
  });

  it("returns isError=true when the issue does not exist", async () => {
    vi.mocked(GitlabHttpClient.prototype.getIssue).mockRejectedValue(
      gitlabHttpError(404, "https://devops.runsystem.info/api/v4/projects/42/issues/999")
    );

    const result = await handleGetIssue({ projectId: "mygroup/myproject", iid: 999 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects a missing projectId", async () => {
    const result = await handleGetIssue({ iid: 12 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.getIssue).not.toHaveBeenCalled();
  });
});
