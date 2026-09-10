import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleReplyToDiscussion } from "../tools/reply-to-discussion.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabNote } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.replyToDiscussion = vi.fn();
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
  id: 500,
  body: "Fixed in the latest push",
  author: "alice",
  createdAt: "2026-09-01T00:00:00Z",
  system: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleReplyToDiscussion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replies to a merge request discussion and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.replyToDiscussion).mockResolvedValue(MOCK_NOTE);

    const result = await handleReplyToDiscussion(
      {
        projectId: "mygroup/myproject",
        noteableType: "merge_request",
        iid: 7,
        discussionId: "abc123disc",
        body: "Fixed in the latest push",
      },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.replyToDiscussion).toHaveBeenCalledWith(
      "mygroup/myproject",
      "merge_request",
      7,
      "abc123disc",
      "Fixed in the latest push"
    );
    expect(result.content[0].text).toContain("Reply added to discussion on !7");
    expect(result.content[0].text).toContain("Fixed in the latest push");
  });

  it("replies to an issue discussion and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.replyToDiscussion).mockResolvedValue(MOCK_NOTE);

    const result = await handleReplyToDiscussion(
      { projectId: "42", noteableType: "issue", iid: 3, discussionId: "d1", body: "ack" },
      MOCK_CFG
    );

    expect(result.content[0].text).toContain("Reply added to discussion on #3");
    expect(result.content[0].text).toContain("gitlab_get_issue");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.replyToDiscussion).mockRejectedValue(authRequired());

    const result = await handleReplyToDiscussion(
      { projectId: "42", noteableType: "issue", iid: 3, discussionId: "d1", body: "ack" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects an invalid noteableType", async () => {
    const result = await handleReplyToDiscussion(
      { projectId: "42", noteableType: "epic", iid: 3, discussionId: "d1", body: "ack" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.replyToDiscussion).not.toHaveBeenCalled();
  });
});
