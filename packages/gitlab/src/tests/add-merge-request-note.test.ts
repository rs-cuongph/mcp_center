import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAddMergeRequestNote } from "../tools/add-merge-request-note.js";
import { authRequired } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabNote } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.addMergeRequestNote = vi.fn();
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
  id: 300,
  body: "LGTM",
  author: "carol",
  createdAt: "2026-09-01T00:00:00Z",
  system: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleAddMergeRequestNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a note to a merge request and formats the result", async () => {
    vi.mocked(GitlabHttpClient.prototype.addMergeRequestNote).mockResolvedValue(MOCK_NOTE);

    const result = await handleAddMergeRequestNote(
      { projectId: "mygroup/myproject", mergeRequestIid: 7, body: "LGTM" },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(GitlabHttpClient.prototype.addMergeRequestNote).toHaveBeenCalledWith(
      "mygroup/myproject",
      7,
      "LGTM"
    );
    expect(result.content[0].text).toContain("Note added to merge request !7");
    expect(result.content[0].text).toContain("LGTM");
  });

  it("returns isError=true when the token is invalid", async () => {
    vi.mocked(GitlabHttpClient.prototype.addMergeRequestNote).mockRejectedValue(authRequired());

    const result = await handleAddMergeRequestNote(
      { projectId: "42", mergeRequestIid: 1, body: "hi" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  it("rejects an empty body", async () => {
    const result = await handleAddMergeRequestNote(
      { projectId: "42", mergeRequestIid: 1, body: "" },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.addMergeRequestNote).not.toHaveBeenCalled();
  });
});
