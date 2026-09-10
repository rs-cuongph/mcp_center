import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSearch } from "../tools/search.js";
import { gitlabHttpError } from "../errors.js";
import type { Config } from "../config.js";
import type { GitlabIssueSummary, GitlabBlobSearchResult } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../gitlab/http-client.js", () => {
  const MockGitlabHttpClient = vi.fn();
  MockGitlabHttpClient.prototype.search = vi.fn();
  return { GitlabHttpClient: MockGitlabHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const MOCK_CFG: Config = {
  GITLAB_URL: "https://devops.runsystem.info",
  GITLAB_TOKEN: "test-token",
  LOG_LEVEL: "info",
  GITLAB_VALIDATE_PATH: "/api/v4/user",
};

const MOCK_ISSUE: GitlabIssueSummary = {
  iid: 7,
  projectId: 42,
  title: "Login broken",
  state: "opened",
  labels: [],
  milestone: null,
  author: "alice",
  assignees: [],
  webUrl: "https://devops.runsystem.info/mygroup/myproject/-/issues/7",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z",
  closedAt: null,
  dueDate: null,
  confidential: false,
  userNotesCount: 0,
};

const MOCK_BLOB: GitlabBlobSearchResult = {
  projectId: 42,
  path: "src/auth.ts",
  filename: "auth.ts",
  ref: "main",
  startLine: 12,
  snippet: "export function login() {}",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders matching issues for scope=issues", async () => {
    vi.mocked(GitlabHttpClient.prototype.search).mockResolvedValue({ issues: [MOCK_ISSUE] });

    const result = await handleSearch({ scope: "issues", search: "login" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Login broken");
    expect(result.content[0].text).toContain("scope: issues");
  });

  it("renders code snippets for scope=blobs", async () => {
    vi.mocked(GitlabHttpClient.prototype.search).mockResolvedValue({ blobs: [MOCK_BLOB] });

    const result = await handleSearch({ scope: "blobs", search: "login" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("src/auth.ts");
    expect(result.content[0].text).toContain("export function login()");
  });

  it("shows an empty-state message when no issues match", async () => {
    vi.mocked(GitlabHttpClient.prototype.search).mockResolvedValue({ issues: [] });

    const result = await handleSearch({ scope: "issues", search: "nonexistent" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No issues found");
  });

  it("returns isError=true on HTTP error", async () => {
    vi.mocked(GitlabHttpClient.prototype.search).mockRejectedValue(
      gitlabHttpError(500, "https://devops.runsystem.info/api/v4/search")
    );

    const result = await handleSearch({ scope: "issues", search: "login" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("GITLAB_HTTP_ERROR");
  });

  it("rejects an empty search query", async () => {
    const result = await handleSearch({ scope: "issues", search: "" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(GitlabHttpClient.prototype.search).not.toHaveBeenCalled();
  });
});
