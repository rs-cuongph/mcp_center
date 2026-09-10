import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListProjects } from "../tools/list-projects.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabProject } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.listProjects = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_PROJECTS: GitlabProject[] = [
  {
    id: 1,
    name: "proj-a",
    nameWithNamespace: "Group / proj-a",
    pathWithNamespace: "group/proj-a",
    description: null,
    defaultBranch: "main",
    webUrl: "https://devops.runsystem.info/group/proj-a",
    visibility: "private",
    archived: false,
    starCount: 0,
    forksCount: 0,
    lastActivityAt: "2026-09-01T00:00:00Z",
    openIssuesCount: 2,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleListProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a project table with pagination footer", async () => {
    vi.mocked(GitlabHttpClient.prototype.listProjects).mockResolvedValue({
      items: MOCK_PROJECTS,
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    const result = await handleListProjects({}, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("group/proj-a");
    expect(result.content[0].text).toContain("Page 1");
  });

  it("shows an empty-state message when no projects match", async () => {
    vi.mocked(GitlabHttpClient.prototype.listProjects).mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 0 },
    });

    const result = await handleListProjects({ search: "nonexistent" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No projects found");
  });

  it("returns isError=true on HTTP error", async () => {
    vi.mocked(GitlabHttpClient.prototype.listProjects).mockRejectedValue(
      gitlabHttpError(500, "https://devops.runsystem.info/api/v4/projects")
    );

    const result = await handleListProjects({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects an out-of-range perPage", async () => {
    const result = await handleListProjects({ perPage: 500 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.listProjects).not.toHaveBeenCalled();
  });
});
