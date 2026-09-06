import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { invalidInput, isMcpError } from "../errors.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const uploadAttachmentContentSchema = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]+-\d+$/, "issueKey must be a valid Jira key"),
  filename: z
    .string()
    .min(1, "filename is required")
    .regex(/\.[a-zA-Z0-9]+$/, "filename must have a file extension"),
  content: z.string().min(1, "content is required"),
  encoding: z
    .enum(["utf8", "base64"])
    .optional()
    .default("utf8")
    .describe("Content encoding: utf8 (plain text, default) or base64"),
  mimeType: z
    .string()
    .optional()
    .describe("Optional MIME type hint, e.g. text/markdown, application/json"),
});

export type UploadAttachmentContentInput = z.infer<
  typeof uploadAttachmentContentSchema
>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleUploadAttachmentContent(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = uploadAttachmentContentSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { issueKey, filename, content, encoding, mimeType } = parsed.data;

  let buffer: Buffer;
  try {
    buffer = decodeContent(content, encoding);
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }

  const resolvedMimeType = mimeType ?? inferMimeType(filename);

  let sessionCookies;
  try {
    sessionCookies = await loadAndValidateSession(
      cfg.JIRA_SESSION_FILE,
      cfg.JIRA_BASE_URL,
      cfg.JIRA_VALIDATE_PATH
    );
  } catch (err: unknown) {
    if (isMcpError(err)) return authErrorContent(err.code, err.message);
    throw err;
  }

  try {
    const client = new JiraHttpClient(cfg.JIRA_BASE_URL, sessionCookies);
    const attachments = await client.uploadAttachmentFromBuffer(
      issueKey,
      buffer,
      filename,
      resolvedMimeType
    );

    const lines = [
      `✅ **Attachment uploaded**`,
      "",
      `| File | Size | MIME | Attachment ID |`,
      `|---|---|---|---|`,
    ];
    for (const attachment of attachments) {
      const sizeLabel = formatBytes(attachment.size);
      lines.push(
        `| ${attachment.filename} | ${sizeLabel} | ${attachment.mimeType ?? "—"} | ${attachment.id} |`
      );
    }
    lines.push(
      "",
      `**Issue:** ${cfg.JIRA_BASE_URL.replace(/\/$/, "")}/browse/${issueKey}`
    );

    return { content: [{ type: "text", text: lines.join("\n") + navigationHint(
      `\`jira_get_issue({issueKey: "${issueKey}", includeAttachmentContent: true})\` to view attachments`,
    ) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeContent(content: string, encoding: "utf8" | "base64"): Buffer {
  if (encoding === "base64") {
    const decoded = Buffer.from(content, "base64");
    // Sanity check: base64 decode should produce at least 1 byte
    if (decoded.length === 0) {
      throw invalidInput("base64 content decoded to an empty buffer");
    }
    return decoded;
  }
  // utf8
  return Buffer.from(content, "utf8");
}

/**
 * Infers a MIME type from a filename extension.
 * Falls back to `application/octet-stream` for unknown extensions.
 */
function inferMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    html: "text/html",
    htm: "text/html",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    yaml: "application/x-yaml",
    yml: "application/x-yaml",
    pdf: "application/pdf",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    log: "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function authErrorContent(code: string, message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `[${code}] ${message}` }],
  };
}
