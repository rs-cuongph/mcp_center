import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListIssues } from "../tools/list-issues.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabIssueSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.listIssues = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_ISSUES: GitlabIssueSummary[] = [
  {
    iid: 7,
    projectId: 42,
    title: "Login broken",
    state: "opened",
    labels: ["bug"],
    milestone: null,
    author: "alice",
    assignees: ["bob"],
    webUrl: "https://devops.runsystem.info/mygroup/myproject/-/issues/7",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
    closedAt: null,
    dueDate: null,
    confidential: false,
    userNotesCount: 0,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleListIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an issue table with pagination footer", async () => {
    vi.mocked(GitlabHttpClient.prototype.listIssues).mockResolvedValue({
      items: MOCK_ISSUES,
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    const result = await handleListIssues({ projectId: "mygroup/myproject" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Login broken");
    expect(result.content[0].text).toContain("Page 1");
  });

  it("shows an empty-state message when no issues match", async () => {
    vi.mocked(GitlabHttpClient.prototype.listIssues).mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 0 },
    });

    const result = await handleListIssues({ projectId: "mygroup/myproject", state: "closed" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No issues found");
  });

  it("returns isError=true on HTTP error", async () => {
    vi.mocked(GitlabHttpClient.prototype.listIssues).mockRejectedValue(
      gitlabHttpError(500, "https://devops.runsystem.info/api/v4/issues")
    );

    const result = await handleListIssues({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects an out-of-range perPage", async () => {
    const result = await handleListIssues({ perPage: 500 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.listIssues).not.toHaveBeenCalled();
  });
});
