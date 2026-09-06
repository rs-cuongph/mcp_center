import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as sessionManager from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import {
  buildSmartSearchPlan,
  handleSmartSearch,
  smartSearchSchema,
} from "../tools/smart-search.js";

vi.mock("../auth/session-manager.js", () => ({
  loadAndValidateSession: vi.fn(),
}));

const mockConfig = {
  JIRA_BASE_URL: "https://jira.example.com",
  JIRA_SESSION_FILE: ".jira/session.json",
  JIRA_VALIDATE_PATH: "/rest/api/2/myself",
  LOG_LEVEL: "info",
  PLAYWRIGHT_HEADLESS: false,
  PLAYWRIGHT_BROWSER: "chromium",
  ATTACHMENT_WORKSPACE: process.cwd(),
};

const sampleIssueSummary = {
  key: "DNIEM-42",
  summary: "Login timeout",
  status: "Open",
  issueType: "Bug",
  assignee: "Cuong Pham",
  priority: "High",
  created: "2026-04-20T00:00:00.000Z",
  updated: "2026-04-26T00:00:00.000Z",
  dueDate: null,
  url: "https://jira.example.com/browse/DNIEM-42",
  originalEstimate: null,
  remainingEstimate: null,
  timeSpent: null,
  defectOwner: null,
  planStartDate: null,
  actualStartDate: null,
  actualEndDate: null,
  severity: "Major",
  defectOrigin: null,
  percentDone: null,
  typeOfWork: null,
};

describe("smartSearchSchema", () => {
  it("accepts a natural-language query with defaults", () => {
    const result = smartSearchSchema.safeParse({ query: "open bugs assigned to me" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.mode).toBe("auto");
    }
  });

  it("rejects empty queries", () => {
    expect(smartSearchSchema.safeParse({ query: "" }).success).toBe(false);
  });
});

describe("buildSmartSearchPlan", () => {
  it("routes issue keys to jira_get_issue behavior", () => {
    expect(buildSmartSearchPlan({ query: "DNIEM-42" })).toEqual({
      type: "issue",
      issueKey: "DNIEM-42",
    });
  });

  it("passes explicit JQL through unchanged", () => {
    expect(buildSmartSearchPlan({ query: "project = DNIEM AND status = Open" })).toEqual({
      type: "jql",
      jql: "project = DNIEM AND status = Open",
      reason: "Detected explicit JQL syntax.",
    });
  });

  it("builds JQL from natural-language intent and structured filters", () => {
    expect(
      buildSmartSearchPlan({
        query: "open bugs assigned to me updated last 7 days",
        project: "DNIEM",
      })
    ).toEqual({
      type: "jql",
      jql: 'project = DNIEM AND issuetype = Bug AND statusCategory != Done AND assignee = currentUser() AND updated >= -7d ORDER BY updated DESC',
      reason: "Built JQL from smart-search filters.",
    });
  });

  it("uses text search when no known filter is present", () => {
    expect(buildSmartSearchPlan({ query: "login timeout", project: "DNIEM" })).toEqual({
      type: "jql",
      jql: 'project = DNIEM AND text ~ "login timeout" ORDER BY updated DESC',
      reason: "Built JQL from smart-search filters.",
    });
  });
});

describe("handleSmartSearch", () => {
  beforeEach(() => {
    vi.mocked(sessionManager.loadAndValidateSession).mockResolvedValue({
      cookieHeader: "JSESSIONID=abc",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searches with generated JQL", async () => {
    const searchSpy = vi.spyOn(JiraHttpClient.prototype, "searchIssues").mockResolvedValue({
      total: 1,
      issues: [sampleIssueSummary],
    });

    const result = await handleSmartSearch(
      { query: "open bugs assigned to me", project: "DNIEM", limit: 5 },
      mockConfig as never
    );

    expect(searchSpy).toHaveBeenCalledWith(
      'project = DNIEM AND issuetype = Bug AND statusCategory != Done AND assignee = currentUser() ORDER BY updated DESC',
      5,
      0
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("# Jira Smart Search Results");
    expect(result.content[0].text).toContain("DNIEM-42");
  });

  it("returns auth errors with isError:true", async () => {
    const { McpError } = await import("../errors.js");
    vi.mocked(sessionManager.loadAndValidateSession).mockRejectedValue(
      new McpError("AUTH_REQUIRED", "No session found.")
    );

    const result = await handleSmartSearch({ query: "open bugs" }, mockConfig as never);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });
});
