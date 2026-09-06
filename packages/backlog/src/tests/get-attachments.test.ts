import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetAttachments } from "../tools/get-attachments.js";
import type { Config } from "../config.js";

vi.mock("../backlog/http-client.js", () => {
  const MockBacklogHttpClient = vi.fn();
  MockBacklogHttpClient.prototype.getIssueAttachments = vi.fn();
  return { BacklogHttpClient: MockBacklogHttpClient };
});

import { BacklogHttpClient } from "../backlog/http-client.js";

const MOCK_CFG: Config = {
  BACKLOG_BASE_URL: "https://test.backlog.com",
  BACKLOG_API_KEY: "test-key",
  ATTACHMENT_WORKSPACE: "./downloads",
};

const MOCK_ATTACHMENTS = [
  {
    id: 1,
    name: "screenshot.png",
    size: 196186,
    sizeFormatted: "191.6 KB",
    uploadedBy: "Alice",
    created: "2024-01-15T06:15:06Z",
  },
  {
    id: 2,
    name: "report.pdf",
    size: 2412345,
    sizeFormatted: "2.3 MB",
    uploadedBy: null,
    created: "2024-01-16T09:00:00Z",
  },
];

describe("handleGetAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns attachment table for an issue", async () => {
    (BacklogHttpClient.prototype.getIssueAttachments as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_ATTACHMENTS
    );

    const result = await handleGetAttachments({ issueIdOrKey: "BLG-123" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("# Attachments — BLG-123");
    expect(result.content[0].text).toContain("screenshot.png");
    expect(result.content[0].text).toContain("report.pdf");
    expect(result.content[0].text).toContain("Alice");
    expect(result.content[0].text).toContain("2 attachment(s)");
    expect(BacklogHttpClient.prototype.getIssueAttachments).toHaveBeenCalledWith("BLG-123");
  });

  it("shows empty message when no attachments", async () => {
    (BacklogHttpClient.prototype.getIssueAttachments as ReturnType<typeof vi.fn>).mockImplementation(
      async () => []
    );

    const result = await handleGetAttachments({ issueIdOrKey: "BLG-999" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("_No attachments found on this issue._");
  });

  it("shows hint to use backlog_download_attachment", async () => {
    (BacklogHttpClient.prototype.getIssueAttachments as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_ATTACHMENTS
    );

    const result = await handleGetAttachments({ issueIdOrKey: "BLG-123" }, MOCK_CFG);

    expect(result.content[0].text).toContain("backlog_download_attachment");
  });

  it("returns isError=true on HTTP error", async () => {
    const { McpError } = await import("../errors.js");
    (BacklogHttpClient.prototype.getIssueAttachments as ReturnType<typeof vi.fn>).mockImplementation(
      async () => { throw new McpError("BACKLOG_HTTP_ERROR", "Backlog HTTP 404"); }
    );

    const result = await handleGetAttachments({ issueIdOrKey: "BAD-1" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("BACKLOG_HTTP_ERROR");
  });

  it("returns isError=true when issueIdOrKey is missing", async () => {
    const result = await handleGetAttachments({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("returns isError=true when issueIdOrKey is empty string", async () => {
    const result = await handleGetAttachments({ issueIdOrKey: "" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });
});
