import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { handleDownloadAttachment, MAX_DOWNLOAD_SIZE } from "../tools/download-attachment.js";

const mockConfig = {
  JIRA_BASE_URL: "https://jira.example.com",
  JIRA_EMAIL: "user@example.com",
  JIRA_PASSWORD: "secret",
  JIRA_VALIDATE_PATH: "/rest/api/2/myself" as const,
  ATTACHMENT_WORKSPACE: "/tmp/jira-dl",
  LOG_LEVEL: "info" as const,
};

vi.mock("../auth/session-manager.js", () => ({
  loadAndValidateSession: vi.fn(),
}));

const mockGetIssue = vi.fn();
const mockDownloadAttachment = vi.fn();

vi.mock("../jira/http-client.js", () => ({
  JiraHttpClient: vi.fn().mockImplementation(() => ({
    getIssue: mockGetIssue,
    downloadAttachment: mockDownloadAttachment,
  })),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

function attachment(over: Partial<{ filename: string; mimeType: string; size: number; downloadUrl: string }>) {
  return {
    filename: "demo.mp4",
    mimeType: "video/mp4",
    size: 1_048_576,
    created: "2026-01-01T00:00:00.000Z",
    author: null,
    downloadUrl: "https://jira.example.com/secure/attachment/1/demo.mp4",
    ...over,
  };
}

describe("jira_download_attachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAndValidateSession).mockResolvedValue({
      cookieHeader: "",
      authorizationHeader: "Basic dXNlcjpwYXNz",
    });
  });

  it("saves a video attachment to the workspace and returns only text (no bytes embedded)", async () => {
    mockGetIssue.mockResolvedValue({ attachments: [attachment({})] });
    const buf = Buffer.from("fake-video-bytes");
    mockDownloadAttachment.mockResolvedValue(buf);

    const res = await handleDownloadAttachment({ issueKey: "PROJ-1", filename: "demo.mp4" }, mockConfig as never);

    expect(res.isError).toBeFalsy();
    expect(vi.mocked(writeFile)).toHaveBeenCalledWith("/tmp/jira-dl/demo.mp4", buf);
    expect(vi.mocked(mkdir)).toHaveBeenCalledWith("/tmp/jira-dl", { recursive: true });
    expect(res.content).toHaveLength(1);
    expect(res.content[0].type).toBe("text");
    expect(res.content[0].text).toContain("demo.mp4");
    expect(res.content[0].text).toContain("video/mp4");
    // Bytes must not be embedded anywhere in the response.
    expect(JSON.stringify(res.content)).not.toContain(buf.toString("base64"));
  });

  it("returns isError when the filename is not found", async () => {
    mockGetIssue.mockResolvedValue({ attachments: [] });
    const res = await handleDownloadAttachment({ issueKey: "PROJ-1", filename: "missing.mp4" }, mockConfig as never);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("missing.mp4");
  });

  it("refuses attachments larger than the size cap without downloading", async () => {
    mockGetIssue.mockResolvedValue({ attachments: [attachment({ size: MAX_DOWNLOAD_SIZE + 1 })] });
    const res = await handleDownloadAttachment({ issueKey: "PROJ-1", filename: "demo.mp4" }, mockConfig as never);
    expect(res.isError).toBe(true);
    expect(mockDownloadAttachment).not.toHaveBeenCalled();
  });
});
