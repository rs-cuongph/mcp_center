import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetPipeline } from "../tools/get-pipeline.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabPipeline, GitlabJob } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.getPipeline = vi.fn();
  MockGitlabHttpClient.prototype.getPipelineJobs = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_PIPELINE: GitlabPipeline = {
  id: 900,
  iid: 12,
  projectId: 42,
  status: "failed",
  ref: "main",
  sha: "abcdef1234567890",
  source: "push",
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/pipelines/900",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T01:00:00Z",
  duration: 90,
};

const MOCK_JOBS: GitlabJob[] = [
  {
    id: 1,
    name: "unit-tests",
    stage: "test",
    status: "failed",
    startedAt: "2026-08-01T00:01:00Z",
    finishedAt: "2026-08-01T00:02:00Z",
    duration: 60,
    webUrl: "https://devops.runsystem.info/mygroup/myproject/-/jobs/1",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pipeline detail with its jobs", async () => {
    vi.mocked(GitlabHttpClient.prototype.getPipeline).mockResolvedValue(MOCK_PIPELINE);
    vi.mocked(GitlabHttpClient.prototype.getPipelineJobs).mockResolvedValue(MOCK_JOBS);

    const result = await handleGetPipeline({ projectId: "mygroup/myproject", pipelineId: 900 }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Pipeline #900");
    expect(result.content[0].text).toContain("unit-tests");
    expect(result.content[0].text).toContain("Jobs (1)");
  });

  it("reports no jobs when the pipeline has none", async () => {
    vi.mocked(GitlabHttpClient.prototype.getPipeline).mockResolvedValue(MOCK_PIPELINE);
    vi.mocked(GitlabHttpClient.prototype.getPipelineJobs).mockResolvedValue([]);

    const result = await handleGetPipeline({ projectId: "mygroup/myproject", pipelineId: 900 }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No jobs reported");
  });

  it("returns isError=true when the pipeline does not exist", async () => {
    vi.mocked(GitlabHttpClient.prototype.getPipeline).mockRejectedValue(
      gitlabHttpError(404, "https://devops.runsystem.info/api/v4/projects/42/pipelines/999")
    );

    const result = await handleGetPipeline({ projectId: "mygroup/myproject", pipelineId: 999 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects a non-positive pipelineId", async () => {
    const result = await handleGetPipeline({ projectId: "mygroup/myproject", pipelineId: 0 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.getPipeline).not.toHaveBeenCalled();
  });
});
