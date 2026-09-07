import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { formatSize } from "../jira/attachment-reader.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Safety cap on a single download held in memory before writing to disk (1 GB). */
export const MAX_DOWNLOAD_SIZE = 1024 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const downloadAttachmentSchema = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]+-\d+$/, "issueKey must be a valid Jira key, e.g. PROJ-123"),
  filename: z
    .string()
    .min(1)
    .describe(
      "Exact attachment filename as shown by jira_get_issue. Any file type is supported, " +
        "including video (mp4/mov/webm), audio, and archives. The file is saved to " +
        "ATTACHMENT_WORKSPACE — its bytes are NOT returned in the response."
    ),
});

export type DownloadAttachmentInput = z.infer<typeof downloadAttachmentSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * MCP tool handler for `jira_download_attachment`.
 * Saves any attachment (regardless of MIME type) to ATTACHMENT_WORKSPACE and
 * returns only a short text summary (path, size, MIME) — never the file bytes.
 */
export async function handleDownloadAttachment(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = downloadAttachmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { issueKey, filename } = parsed.data;

  let sessionCookies;
  try {
    sessionCookies = await loadAndValidateSession(cfg.JIRA_BASE_URL, cfg.JIRA_VALIDATE_PATH);
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    throw err;
  }

  try {
    const client = new JiraHttpClient(cfg.JIRA_BASE_URL, sessionCookies);
    const issue = await client.getIssue(issueKey);

    const matches = issue.attachments.filter((a) => a.filename === filename);
    if (matches.length === 0) {
      return errorContent(
        `No attachment named "${filename}" on ${issueKey}. ` +
          `Run jira_get_issue({ issueKey: "${issueKey}" }) to list attachment filenames.`
      );
    }
    if (matches.length > 1) {
      return errorContent(
        `Multiple attachments named "${filename}" exist on ${issueKey}; cannot disambiguate ` +
          `(Jira attachment IDs are not exposed). Rename or remove duplicates in Jira, then retry.`
      );
    }

    const att = matches[0];
    if (att.size > MAX_DOWNLOAD_SIZE) {
      return errorContent(
        `Attachment "${filename}" is ${formatSize(att.size)}, exceeding the ${formatSize(
          MAX_DOWNLOAD_SIZE
        )} download cap.`
      );
    }

    const buffer = await client.downloadAttachment(att.downloadUrl);

    await mkdir(cfg.ATTACHMENT_WORKSPACE, { recursive: true });
    const outputPath = join(cfg.ATTACHMENT_WORKSPACE, basename(filename));
    await writeFile(outputPath, buffer);

    const text = [
      `# Download Complete`,
      ``,
      `**File:** ${filename}`,
      `**Type:** ${att.mimeType}`,
      `**Size:** ${formatSize(buffer.length)} (${buffer.length} bytes)`,
      `**Saved to:** ${resolve(outputPath)}`,
      `**Issue:** ${cfg.JIRA_BASE_URL.replace(/\/$/, "")}/browse/${issueKey}`,
      navigationHint(
        `\`jira_get_issue({ issueKey: "${issueKey}" })\` — view all attachments on this issue`
      ),
    ].join("\n");

    return { content: [{ type: "text", text }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

function errorContent(message: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return { content: [{ type: "text", text: message }], isError: true };
}
