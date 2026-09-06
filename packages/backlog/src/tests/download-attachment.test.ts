import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleDownloadAttachment } from "../tools/download-attachment.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../backlog/http-client.js", () => {
  const MockBacklogHttpClient = vi.fn();
  MockBacklogHttpClient.prototype.downloadAttachment = vi.fn();
  return { BacklogHttpClient: MockBacklogHttpClient };
});

// Mock fs and path so tests don't touch the real filesystem
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { BacklogHttpClient } from "../backlog/http-client.js";
import * as fsMock from "node:fs/promises";

const MOCK_CFG: Config = {
  BACKLOG_BASE_URL: "https://test.backlog.com",
  BACKLOG_API_KEY: "test-key",
  ATTACHMENT_WORKSPACE: "/tmp/test-downloads",
};

const MOCK_BUFFER = Buffer.from("fake file content");

describe("handleDownloadAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("downloads file and returns saved path info", async () => {
    (BacklogHttpClient.prototype.downloadAttachment as ReturnType<typeof vi.fn>).mockImplementation(
      async () => ({ data: MOCK_BUFFER, filename: "screenshot.png" })
    );

    const result = await handleDownloadAttachment(
      { issueIdOrKey: "BLG-123", attachmentId: 1 },
      MOCK_CFG
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("# Download Complete");
    expect(result.content[0].text).toContain("screenshot.png");
    expect(result.content[0].text).toContain("BLG-123");
    expect(result.content[0].text).toContain("1"); // attachmentId
    expect(BacklogHttpClient.prototype.downloadAttachment).toHaveBeenCalledWith("BLG-123", 1);
  });

  it("uses default outputDir when not specified", async () => {
    (BacklogHttpClient.prototype.downloadAttachment as ReturnType<typeof vi.fn>).mockImplementation(
      async () => ({ data: MOCK_BUFFER, filename: "doc.pdf" })
    );

    await handleDownloadAttachment({ issueIdOrKey: "BLG-1", attachmentId: 5 }, MOCK_CFG);

    expect(fsMock.mkdir).toHaveBeenCalledWith("/tmp/test-downloads", { recursive: true });
  });

  it("uses BACKLOG_DOWNLOAD_DIR from config", async () => {
    (BacklogHttpClient.prototype.downloadAttachment as ReturnType<typeof vi.fn>).mockImplementation(
      async () => ({ data: MOCK_BUFFER, filename: "doc.pdf" })
    );

    await handleDownloadAttachment({ issueIdOrKey: "BLG-1", attachmentId: 5 }, MOCK_CFG);

    expect(fsMock.mkdir).toHaveBeenCalledWith("/tmp/test-downloads", { recursive: true });
  });

  it("returns isError=true on HTTP error", async () => {
    const { McpError } = await import("../errors.js");
    (BacklogHttpClient.prototype.downloadAttachment as ReturnType<typeof vi.fn>).mockImplementation(
      async () => { throw new McpError("BACKLOG_HTTP_ERROR", "Backlog HTTP 404"); }
    );

    const result = await handleDownloadAttachment(
      { issueIdOrKey: "BLG-1", attachmentId: 99 },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("BACKLOG_HTTP_ERROR");
  });

  it("returns isError=true when issueIdOrKey is missing", async () => {
    const result = await handleDownloadAttachment({ attachmentId: 1 }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("returns isError=true when attachmentId is missing", async () => {
    const result = await handleDownloadAttachment({ issueIdOrKey: "BLG-1" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("returns isError=true when attachmentId is not a positive integer", async () => {
    const result = await handleDownloadAttachment(
      { issueIdOrKey: "BLG-1", attachmentId: -1 },
      MOCK_CFG
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });
});
