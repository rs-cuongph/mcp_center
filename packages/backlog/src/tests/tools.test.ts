import { describe, it, expect, vi } from "vitest";
import { getIssueListSchema } from "../tools/get-issue-list.js";
import { getIssueSchema } from "../tools/get-issue.js";
import { getCommentsSchema } from "../tools/get-comments.js";
import { exportIssueContextSchema } from "../tools/export-issue-context.js";

// ---------------------------------------------------------------------------
// Schema: backlog_get_issue_list
// ---------------------------------------------------------------------------

describe("getIssueListSchema", () => {
  it("accepts minimal input (no filters)", () => {
    const result = getIssueListSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(20);
      expect(result.data.offset).toBe(0);
      expect(result.data.order).toBe("desc");
    }
  });

  it("accepts full filter set", () => {
    const result = getIssueListSchema.safeParse({
      projectId: [10, 20],
      statusId: [1, 2],
      priorityId: [2],
      assigneeId: [5],
      keyword: "login bug",
      count: 50,
      offset: 100,
      sort: "updated",
      order: "asc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects count above 100", () => {
    const result = getIssueListSchema.safeParse({ count: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects count of 0", () => {
    const result = getIssueListSchema.safeParse({ count: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative offset", () => {
    const result = getIssueListSchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid order value", () => {
    const result = getIssueListSchema.safeParse({ order: "random" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid parentChild value", () => {
    const result = getIssueListSchema.safeParse({ parentChild: 5 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Schema: backlog_get_issue
// ---------------------------------------------------------------------------

describe("getIssueSchema", () => {
  it("accepts a string issue key", () => {
    expect(getIssueSchema.safeParse({ issueIdOrKey: "BLG-123" }).success).toBe(true);
  });

  it("accepts a numeric ID as string", () => {
    expect(getIssueSchema.safeParse({ issueIdOrKey: "12345" }).success).toBe(true);
  });

  it("rejects empty string", () => {
    expect(getIssueSchema.safeParse({ issueIdOrKey: "" }).success).toBe(false);
  });

  it("rejects missing field", () => {
    expect(getIssueSchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Schema: backlog_get_comments
// ---------------------------------------------------------------------------

describe("getCommentsSchema", () => {
  it("accepts minimal input with defaults applied", () => {
    const result = getCommentsSchema.safeParse({ issueIdOrKey: "BLG-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(20);
      expect(result.data.order).toBe("desc");
    }
  });

  it("accepts count override and asc order", () => {
    const result = getCommentsSchema.safeParse({
      issueIdOrKey: "BLG-1",
      count: 50,
      order: "asc",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minId and maxId for pagination", () => {
    const result = getCommentsSchema.safeParse({
      issueIdOrKey: "BLG-1",
      minId: 100,
      maxId: 200,
    });
    expect(result.success).toBe(true);
  });

  it("rejects count above 100", () => {
    expect(getCommentsSchema.safeParse({ issueIdOrKey: "BLG-1", count: 101 }).success).toBe(false);
  });

  it("rejects negative minId", () => {
    expect(getCommentsSchema.safeParse({ issueIdOrKey: "BLG-1", minId: -1 }).success).toBe(false);
  });

  it("rejects empty issueIdOrKey", () => {
    expect(getCommentsSchema.safeParse({ issueIdOrKey: "" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Handler: backlog_get_issue — HTTP client error propagation (mocked)
// ---------------------------------------------------------------------------

describe("handleGetIssue — HTTP error propagation", () => {
  vi.mock("../backlog/http-client.js", () => ({
    BacklogHttpClient: vi.fn().mockImplementation(() => ({
      getIssue: vi.fn().mockImplementation(async () => {
        const { McpError } = await import("../errors.js");
        throw new McpError("BACKLOG_HTTP_ERROR", "Backlog HTTP 404 from /api/v2/issues/BLG-999");
      }),
    })),
  }));

  it("returns error content when API returns 404", async () => {
    const { handleGetIssue } = await import("../tools/get-issue.js");
    const mockConfig = {
      BACKLOG_BASE_URL: "https://space.backlog.com",
      BACKLOG_API_KEY: "test-key",
    };

    const result = await handleGetIssue({ issueIdOrKey: "BLG-999" }, mockConfig as never);

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe("text");
    if (result.content[0].type === "text") {
      expect(result.content[0].text).toContain("BACKLOG_HTTP_ERROR");
    }
  });
});

// ---------------------------------------------------------------------------
// Handler: backlog_get_issue — invalid input
// ---------------------------------------------------------------------------

describe("handleGetIssue — invalid input", () => {
  it("returns error content for missing issueIdOrKey", async () => {
    const { handleGetIssue } = await import("../tools/get-issue.js");
    const mockConfig = {
      BACKLOG_BASE_URL: "https://space.backlog.com",
      BACKLOG_API_KEY: "test-key",
    };

    const result = await handleGetIssue({}, mockConfig as never);

    expect(result.isError).toBe(true);
    if (result.content[0].type === "text") {
      expect(result.content[0].text).toContain("Invalid input");
    }
  });
});

// ---------------------------------------------------------------------------
// Schema: backlog_export_issue_context
// ---------------------------------------------------------------------------

describe("Schema: backlog_export_issue_context", () => {
  it("accepts minimal input and applies defaults", () => {
    const result = exportIssueContextSchema.safeParse({ issueIdOrKey: "BLG-10474" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeComments).toBe(true);
      expect(result.data.includeAttachments).toBe(true);
      expect(result.data.downloadAttachments).toBe(true);
      expect(result.data.extractReadableFiles).toBe(false);
    }
  });

  it("rejects empty issueIdOrKey", () => {
    expect(exportIssueContextSchema.safeParse({ issueIdOrKey: "" }).success).toBe(false);
  });

  it("rejects invalid maxAttachmentBytes", () => {
    expect(
      exportIssueContextSchema.safeParse({
        issueIdOrKey: "BLG-10474",
        maxAttachmentBytes: 0,
      }).success
    ).toBe(false);
  });
});
