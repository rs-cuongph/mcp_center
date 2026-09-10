import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListBranches } from "../tools/list-branches.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabBranch } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.listBranches = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_BRANCHES: GitlabBranch[] = [
  {
    name: "main",
    commitShortId: "abcdef12",
    commitTitle: "Fix login redirect",
    committedDate: "2026-08-01T00:00:00Z",
    merged: false,
    protected: true,
    default: true,
    webUrl: "https://devops.runsystem.info/mygroup/myproject/-/tree/main",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleListBranches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a branch table marking the default branch as protected", async () => {
    vi.mocked(GitlabHttpClient.prototype.listBranches).mockResolvedValue({
      items: MOCK_BRANCHES,
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    const result = await handleListBranches({ projectId: "mygroup/myproject" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("main");
    expect(result.content[0].text).toContain("(default)");
    expect(result.content[0].text).toContain("| yes | no |");
  });

  it("shows an empty-state message when no branches match", async () => {
    vi.mocked(GitlabHttpClient.prototype.listBranches).mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 0 },
    });

    const result = await handleListBranches({ projectId: "mygroup/myproject", search: "nonexistent" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No branches found");
  });

  it("returns isError=true on HTTP error", async () => {
    vi.mocked(GitlabHttpClient.prototype.listBranches).mockRejectedValue(
      gitlabHttpError(404, "https://devops.runsystem.info/api/v4/projects/42/repository/branches")
    );

    const result = await handleListBranches({ projectId: "mygroup/missing" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects a missing projectId", async () => {
    const result = await handleListBranches({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.listBranches).not.toHaveBeenCalled();
  });
});
