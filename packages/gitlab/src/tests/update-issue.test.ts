import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleUpdateIssue } from "../tools/update-issue.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabIssue } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.updateIssue = vi.fn();
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
  title: "New bug (updated)",
  description: "Steps to reproduce",
  state: "closed",
  labels: ["bug", "confirmed"],
  milestone: null,
  author: "alice",
  assignees: ["bob"],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/issues/42",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-02T00:00:00Z",
  closedAt: "2026-09-02T00:00:00Z",
  dueDate: null,
  confidential: false,
  userNotesCount: 1,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleUpdateIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an issue and formats the result, normalizing label fields to the client call", async () => {
    vi.mocked(GitlabHttpClient.prototype.updateIssue).mockResolvedValue(MOCK_ISSUE);

    const result = await handleUpdateIssue(
      {
        projectId: "mygroup/myproject",
        issueIid: 42,
        stateEvent: "close",
        addLabels: ["confirmed"],
        assigneeIds: [2],
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.updateIssue).toHaveBeenCalledWith("mygroup/myproject", 42, {
      title: undefined,
      description: undefined,
      stateEvent: "close",
      labels: undefined,
      addLabels: ["confirmed"],
      removeLabels: undefined,
      assigneeIds: [2],
    });
    expect(result.content[0].text).toContain("Issue updated");
    expect(result.content[0].text).toContain("#42 New bug (updated)");
    expect(result.content[0].text).toContain("closed");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.updateIssue).mockRejectedValue(authRequired());

    const result = await handleUpdateIssue({ projectId: "42", issueIid: 42, title: "x" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects a missing issueIid", async () => {
    const result = await handleUpdateIssue({ projectId: "42", title: "x" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.updateIssue).not.toHaveBeenCalled();
  });
});
