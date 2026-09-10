import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCreateIssue } from "../tools/create-issue.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabIssue } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.createIssue = vi.fn();
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
  iid: 42,
  projectId: 7,
  title: "New bug",
  description: "Steps to reproduce",
  state: "opened",
  labels: ["bug"],
  milestone: null,
  author: "alice",
  assignees: [],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/issues/42",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  closedAt: null,
  dueDate: null,
  confidential: false,
  userNotesCount: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleCreateIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an issue and formats the result, normalizing array labels to the client call", async () => {
    vi.mocked(GitlabHttpClient.prototype.createIssue).mockResolvedValue(MOCK_ISSUE);

    const result = await handleCreateIssue(
      {
        projectId: "mygroup/myproject",
        title: "New bug",
        description: "Steps to reproduce",
        labels: ["bug", "urgent"],
        assigneeIds: [1, 2],
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.createIssue).toHaveBeenCalledWith("mygroup/myproject", {
      title: "New bug",
      description: "Steps to reproduce",
      labels: ["bug", "urgent"],
      assigneeIds: [1, 2],
    });
    expect(result.content[0].text).toContain("Issue created");
    expect(result.content[0].text).toContain("#42 New bug");
    expect(result.content[0].text).toContain(MOCK_ISSUE.webUrl);
  });

  it("normalizes a comma-separated labels string into an array before calling the client", async () => {
    vi.mocked(GitlabHttpClient.prototype.createIssue).mockResolvedValue(MOCK_ISSUE);

    await handleCreateIssue(
      { projectId: "mygroup/myproject", title: "New bug", labels: "bug, urgent" },
      MOCK_CFG
    );

    expect(GitlabHttpClient.prototype.createIssue).toHaveBeenCalledWith("mygroup/myproject", {
      title: "New bug",
      description: undefined,
      labels: ["bug", "urgent"],
      assigneeIds: undefined,
    });
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.createIssue).mockRejectedValue(authRequired());

    const result = await handleCreateIssue({ projectId: "42", title: "New bug" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects a missing title", async () => {
    const result = await handleCreateIssue({ projectId: "42" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.createIssue).not.toHaveBeenCalled();
  });
});
