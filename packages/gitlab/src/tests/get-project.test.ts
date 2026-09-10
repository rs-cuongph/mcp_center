import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetProject } from "../tools/get-project.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabProject } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.getProject = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_PROJECT: GitlabProject = {
  id: 42,
  name: "myproject",
  nameWithNamespace: "Group / myproject",
  pathWithNamespace: "mygroup/myproject",
  description: "A test project",
  defaultBranch: "main",
  webUrl: "https://devops.runsystem.info/mygroup/myproject",
  visibility: "private",
  archived: false,
  starCount: 3,
  forksCount: 1,
  lastActivityAt: "2026-09-01T00:00:00Z",
  openIssuesCount: 5,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the project detail", async () => {
    vi.mocked(GitlabHttpClient.prototype.getProject).mockResolvedValue(MOCK_PROJECT);

    const result = await handleGetProject({ projectId: "mygroup/myproject" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("mygroup/myproject");
    expect(result.content[0].text).toContain("private");
  });

  it("returns isError=true when the project does not exist", async () => {
    vi.mocked(GitlabHttpClient.prototype.getProject).mockRejectedValue(
      gitlabHttpError(404, "https://devops.runsystem.info/api/v4/projects/mygroup%2Fmissing")
    );

    const result = await handleGetProject({ projectId: "mygroup/missing" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects a missing projectId", async () => {
    const result = await handleGetProject({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.getProject).not.toHaveBeenCalled();
  });
});
