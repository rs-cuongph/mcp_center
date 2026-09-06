import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetProjects } from "../tools/get-projects.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../backlog/http-client.js", () => {
  const MockBacklogHttpClient = vi.fn();
  MockBacklogHttpClient.prototype.getProjects = vi.fn();
  return { BacklogHttpClient: MockBacklogHttpClient };
});

import { BacklogHttpClient } from "../backlog/http-client.js";

const MOCK_CFG: Config = {
  BACKLOG_BASE_URL: "https://test.backlog.com",
  BACKLOG_API_KEY: "test-key",
  ATTACHMENT_WORKSPACE: "./downloads",
};

const MOCK_PROJECTS = [
  {
    id: 1,
    projectKey: "TEST",
    name: "Test Project",
    archived: false,
    chartEnabled: false,
    subtaskingEnabled: false,
    useWiki: true,
    useFileSharing: true,
    useGit: true,
    textFormattingRule: "markdown",
  },
  {
    id: 2,
    projectKey: "DEMO",
    name: "Demo Project",
    archived: true,
    chartEnabled: true,
    subtaskingEnabled: true,
    useWiki: false,
    useFileSharing: false,
    useGit: false,
    textFormattingRule: "backlog",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all projects when archived is omitted", async () => {
    (BacklogHttpClient.prototype.getProjects as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_PROJECTS
    );

    const result = await handleGetProjects({}, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("# All Projects");
    expect(result.content[0].text).toContain("TEST");
    expect(result.content[0].text).toContain("DEMO");
  });

  it("passes archived=false to client for active-only filter", async () => {
    (BacklogHttpClient.prototype.getProjects as ReturnType<typeof vi.fn>).mockImplementation(
      async () => [MOCK_PROJECTS[0]]
    );

    const result = await handleGetProjects({ archived: false }, MOCK_CFG);

    expect(BacklogHttpClient.prototype.getProjects).toHaveBeenCalledWith(false);
    expect(result.content[0].text).toContain("# Active Projects");
    expect(result.content[0].text).toContain("TEST");
  });

  it("passes archived=true to client for archived-only filter", async () => {
    (BacklogHttpClient.prototype.getProjects as ReturnType<typeof vi.fn>).mockImplementation(
      async () => [MOCK_PROJECTS[1]]
    );

    const result = await handleGetProjects({ archived: true }, MOCK_CFG);

    expect(BacklogHttpClient.prototype.getProjects).toHaveBeenCalledWith(true);
    expect(result.content[0].text).toContain("# Archived Projects");
    expect(result.content[0].text).toContain("DEMO");
    expect(result.content[0].text).toContain("✓");
  });

  it("shows _No projects found._ for empty result", async () => {
    (BacklogHttpClient.prototype.getProjects as ReturnType<typeof vi.fn>).mockImplementation(
      async () => []
    );

    const result = await handleGetProjects({}, MOCK_CFG);

    expect(result.content[0].text).toContain("_No projects found._");
  });

  it("returns isError=true on HTTP error", async () => {
    const { McpError } = await import("../errors.js");
    (BacklogHttpClient.prototype.getProjects as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        throw new McpError("BACKLOG_HTTP_ERROR", "Backlog HTTP 401");
      }
    );

    const result = await handleGetProjects({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("BACKLOG_HTTP_ERROR");
  });

  it("rejects non-boolean archived input", async () => {
    const result = await handleGetProjects({ archived: "yes" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });
});
