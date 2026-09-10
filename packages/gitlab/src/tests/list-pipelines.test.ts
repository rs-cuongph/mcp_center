import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListPipelines } from "../tools/list-pipelines.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabPipeline } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.listPipelines = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_PIPELINES: GitlabPipeline[] = [
  {
    id: 900,
    iid: 12,
    projectId: 42,
    status: "success",
    ref: "main",
    sha: "abcdef1234567890",
    source: "push",
    webUrl: "https://devops.runsystem.info/mygroup/myproject/-/pipelines/900",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T01:00:00Z",
    duration: 120,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleListPipelines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a pipeline table with pagination footer", async () => {
    vi.mocked(GitlabHttpClient.prototype.listPipelines).mockResolvedValue({
      items: MOCK_PIPELINES,
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    const result = await handleListPipelines({ projectId: "mygroup/myproject" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("success");
    expect(result.content[0].text).toContain("main");
  });

  it("shows an empty-state message when no pipelines match", async () => {
    vi.mocked(GitlabHttpClient.prototype.listPipelines).mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 0 },
    });

    const result = await handleListPipelines({ projectId: "mygroup/myproject", status: "failed" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No pipelines found");
  });

  it("returns isError=true on HTTP error", async () => {
    vi.mocked(GitlabHttpClient.prototype.listPipelines).mockRejectedValue(
      gitlabHttpError(404, "https://devops.runsystem.info/api/v4/projects/42/pipelines")
    );

    const result = await handleListPipelines({ projectId: "mygroup/missing" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects a missing projectId", async () => {
    const result = await handleListPipelines({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.listPipelines).not.toHaveBeenCalled();
  });
});
