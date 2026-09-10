import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListCommits } from "../tools/list-commits.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabCommit } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.listCommits = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_COMMITS: GitlabCommit[] = [
  {
    id: "abcdef1234567890",
    shortId: "abcdef12",
    title: "Fix login redirect",
    authorName: "Alice Smith",
    authoredDate: "2026-08-01T00:00:00Z",
    webUrl: "https://devops.runsystem.info/mygroup/myproject/-/commit/abcdef1234567890",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleListCommits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a commit table with pagination footer", async () => {
    vi.mocked(GitlabHttpClient.prototype.listCommits).mockResolvedValue({
      items: MOCK_COMMITS,
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    const result = await handleListCommits({ projectId: "mygroup/myproject" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("abcdef12");
    expect(result.content[0].text).toContain("Fix login redirect");
  });

  it("shows an empty-state message when no commits match", async () => {
    vi.mocked(GitlabHttpClient.prototype.listCommits).mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 0 },
    });

    const result = await handleListCommits({ projectId: "mygroup/myproject", ref: "empty-branch" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No commits found");
  });

  it("returns isError=true on HTTP error", async () => {
    vi.mocked(GitlabHttpClient.prototype.listCommits).mockRejectedValue(
      gitlabHttpError(404, "https://devops.runsystem.info/api/v4/projects/42/repository/commits")
    );

    const result = await handleListCommits({ projectId: "mygroup/missing" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects a missing projectId", async () => {
    const result = await handleListCommits({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.listCommits).not.toHaveBeenCalled();
  });
});
