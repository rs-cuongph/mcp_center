import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetFile } from "../tools/get-file.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabFile } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.getFile = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("embeds text content for a small file", async () => {
    const file: GitlabFile = {
      filePath: "src/index.ts",
      ref: "main",
      size: 42,
      binary: false,
      truncated: false,
      content: "export const x = 1;",
    };
    vi.mocked(GitlabHttpClient.prototype.getFile).mockResolvedValue(file);

    const result = await handleGetFile({ projectId: "mygroup/myproject", filePath: "src/index.ts" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("export const x = 1;");
  });

  it("reports metadata only, without base64/bytes, for a binary file", async () => {
    const file: GitlabFile = {
      filePath: "assets/logo.png",
      ref: "main",
      size: 20_000,
      binary: true,
      truncated: false,
      content: null,
    };
    vi.mocked(GitlabHttpClient.prototype.getFile).mockResolvedValue(file);

    const result = await handleGetFile({ projectId: "mygroup/myproject", filePath: "assets/logo.png" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Binary file");
    expect(text).not.toContain("base64");
    // No embedded content block for a binary file.
    expect(text).not.toContain("```");
  });

  it("reports metadata only for a file above the inline size limit", async () => {
    const file: GitlabFile = {
      filePath: "dist/bundle.js",
      ref: "main",
      size: 500_000,
      binary: false,
      truncated: true,
      content: null,
    };
    vi.mocked(GitlabHttpClient.prototype.getFile).mockResolvedValue(file);

    const result = await handleGetFile({ projectId: "mygroup/myproject", filePath: "dist/bundle.js" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("above the inline limit");
  });

  it("returns isError=true when the file does not exist at the given ref", async () => {
    vi.mocked(GitlabHttpClient.prototype.getFile).mockRejectedValue(
      gitlabHttpError(404, "https://devops.runsystem.info/api/v4/projects/42/repository/files/missing.ts")
    );

    const result = await handleGetFile({ projectId: "mygroup/myproject", filePath: "missing.ts" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });
});
