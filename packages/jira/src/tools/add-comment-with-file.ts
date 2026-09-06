/**
 * add-comment-with-file.ts
 *
 * Composite tool: upload in-memory content as an issue attachment, then post
 * a comment that references it via Jira Wiki Markup `[^filename]` syntax.
 *
 * Jira Server 8 does not support attaching files directly to comments via REST.
 * The workaround is:
 *   1. POST /rest/api/2/issue/{key}/attachments  → file attached to the issue
 *   2. POST /rest/api/2/issue/{key}/comment       → body contains [^filename]
 *
 * In Jira Wiki Markup:
 *   [^filename.ext]   → clickable link to the attachment
 *   !image.png!       → inline image (for PNG/JPG/GIF)
 */

import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import type { SessionCookies } from "../types.js";
import { invalidInput, isMcpError } from "../errors.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { normalizeJiraBody } from "../jira/body-normalizer.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const addCommentWithFileSchema = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]+-\d+$/, "issueKey must be a valid Jira key (e.g. PROJ-123)"),

  /** Comment body — Markdown (default) or plain Jira Wiki Markup. */
  body: z.string().min(1, "body is required"),
  bodyFormat: z
    .enum(["plain", "markdown"])
    .optional()
    .default("markdown")
    .describe('How to interpret body: "markdown" (default) or "plain" (Jira Wiki Markup as-is).'),

  /** Attachment to upload alongside the comment. */
  filename: z
    .string()
    .min(1, "filename is required")
    .regex(/\.[a-zA-Z0-9]+$/, "filename must have a file extension (e.g. report.md)"),
  fileContent: z.string().min(1, "fileContent is required"),
  fileEncoding: z
    .enum(["utf8", "base64"])
    .optional()
    .default("utf8")
    .describe('Encoding of fileContent: "utf8" (plain text, default) or "base64" (binary).'),
  mimeType: z
    .string()
    .optional()
    .describe("Optional MIME type override. Inferred from filename extension if omitted."),

  /**
   * Where to place the attachment reference in the comment.
   * - "append"  (default): adds a "📎 Attachment: [^filename]" line at the bottom.
   * - "inline":  replaces the placeholder `{{ATTACHMENT}}` in the body with `[^filename]`.
   */
  attachmentPlacement: z
    .enum(["append", "inline"])
    .optional()
    .default("append")
    .describe(
      'Where to inject the [^filename] reference: "append" (default) adds it at the bottom; ' +
      '"inline" replaces {{ATTACHMENT}} placeholder in the body.'
    ),
});

export type AddCommentWithFileInput = z.infer<typeof addCommentWithFileSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleAddCommentWithFile(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = addCommentWithFileSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const {
    issueKey,
    body,
    bodyFormat,
    filename,
    fileContent,
    fileEncoding,
    mimeType,
    attachmentPlacement,
  } = parsed.data;

  // Decode file content
  let buffer: Buffer;
  try {
    buffer = decodeFileContent(fileContent, fileEncoding);
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }

  const resolvedMimeType = mimeType ?? inferMimeType(filename);

  // Load session once — reuse for both API calls
  let sessionCookies: SessionCookies;
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

  const client = new JiraHttpClient(cfg.JIRA_BASE_URL, sessionCookies);

  // -------------------------------------------------------------------------
  // Step 1: Upload file as issue attachment
  // -------------------------------------------------------------------------
  let uploadedFilename: string;
  let attachmentId: string;
  try {
    const attachments = await client.uploadAttachmentFromBuffer(
      issueKey,
      buffer,
      filename,
      resolvedMimeType
    );
    if (attachments.length === 0) {
      return errorContent("Attachment upload succeeded but Jira returned no attachment records.");
    }
    uploadedFilename = attachments[0].filename;
    attachmentId = attachments[0].id;
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[Upload failed] [${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(`[Upload failed] ${err.message}`);
    throw err;
  }

  // -------------------------------------------------------------------------
  // Step 2: Build comment body with [^filename] reference
  // -------------------------------------------------------------------------
  const attachmentRef = buildAttachmentRef(uploadedFilename, resolvedMimeType);
  const finalBody = injectAttachmentRef(body, attachmentRef, attachmentPlacement);

  // Convert Markdown → Jira Wiki Markup (or pass through if plain)
  const wikiBody = normalizeJiraBody(finalBody, bodyFormat);

  // -------------------------------------------------------------------------
  // Step 3: Post comment
  // -------------------------------------------------------------------------
  let commentId: string;
  let commentUrl: string;
  try {
    const comment = await client.addComment(issueKey, { body: wikiBody });
    commentId = comment.id;
    commentUrl = comment.url;
  } catch (err: unknown) {
    // Attachment already uploaded — report partial success so user knows
    if (isMcpError(err)) {
      return errorContent(
        `⚠️ Attachment uploaded (ID: ${attachmentId}, file: ${uploadedFilename}) ` +
        `but comment posting failed: [${err.code}] ${err.message}`
      );
    }
    if (err instanceof Error) {
      return errorContent(
        `⚠️ Attachment uploaded (ID: ${attachmentId}, file: ${uploadedFilename}) ` +
        `but comment posting failed: ${err.message}`
      );
    }
    throw err;
  }

  // -------------------------------------------------------------------------
  // Success response
  // -------------------------------------------------------------------------
  const issueUrl = `${cfg.JIRA_BASE_URL.replace(/\/$/, "")}/browse/${issueKey}`;

  const text = [
    `✅ **Comment with attachment posted**`,
    ``,
    `| Field          | Value |`,
    `|----------------|-------|`,
    `| **Issue**      | [${issueKey}](${issueUrl}) |`,
    `| **Comment ID** | ${commentId} |`,
    `| **File**       | ${uploadedFilename} |`,
    `| **Attachment ID** | ${attachmentId} |`,
    `| **Comment URL** | ${commentUrl} |`,
  ].join("\n") + navigationHint(
    `\`jira_get_comments({issueKey: "${issueKey}"})\` to view the posted comment`,
  );

  return { content: [{ type: "text", text }] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Jira Wiki Markup reference for the uploaded attachment.
 * Images use `!filename!` (inline display); other files use `[^filename]`.
 */
function buildAttachmentRef(filename: string, mimeType: string): string {
  if (mimeType.startsWith("image/")) {
    return `!${filename}!`;
  }
  return `[^${filename}]`;
}

/**
 * Injects the attachment reference into the body.
 * - "append": appends a labelled line at the end.
 * - "inline": replaces the literal string `{{ATTACHMENT}}` with the ref.
 */
function injectAttachmentRef(
  body: string,
  ref: string,
  placement: "append" | "inline"
): string {
  if (placement === "inline") {
    if (!body.includes("{{ATTACHMENT}}")) {
      // Placeholder missing — fall back to append
      return `${body}\n\n📎 **Attachment:** ${ref}`;
    }
    return body.replaceAll("{{ATTACHMENT}}", ref);
  }
  // Default: append
  return `${body}\n\n📎 **Attachment:** ${ref}`;
}

function decodeFileContent(content: string, encoding: "utf8" | "base64"): Buffer {
  if (encoding === "base64") {
    const decoded = Buffer.from(content, "base64");
    if (decoded.length === 0) {
      throw invalidInput("base64 fileContent decoded to an empty buffer");
    }
    return decoded;
  }
  return Buffer.from(content, "utf8");
}

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

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function authErrorContent(code: string, message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `[${code}] ${message}` }],
  };
}
