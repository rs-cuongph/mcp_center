import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAddIssueNote } from "../tools/add-issue-note.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabNote } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.addIssueNote = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_NOTE: GitlabNote = {
  id: 200,
  body: "Confirmed the bug",
  author: "bob",
  createdAt: "2026-09-01T00:00:00Z",
  system: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleAddIssueNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a note to an issue and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.addIssueNote).mockResolvedValue(MOCK_NOTE);

    const result = await handleAddIssueNote(
      { projectId: "mygroup/myproject", issueIid: 42, body: "Confirmed the bug" },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.addIssueNote).toHaveBeenCalledWith(
      "mygroup/myproject",
      42,
      "Confirmed the bug"
    );
    expect(result.content[0].text).toContain("Note added to issue #42");
    expect(result.content[0].text).toContain("Confirmed the bug");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.addIssueNote).mockRejectedValue(authRequired());

    const result = await handleAddIssueNote({ projectId: "42", issueIid: 1, body: "hi" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects an empty body", async () => {
    const result = await handleAddIssueNote({ projectId: "42", issueIid: 1, body: "" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.addIssueNote).not.toHaveBeenCalled();
  });
});
