import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, truncate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabCommitComment } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const addCommitCommentSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  sha: z.string().min(1, "sha is required").describe("Commit SHA to comment on"),
  note: z.string().min(1, "note is required").describe("Comment text (Markdown supported by GitLab)"),
  path: z.string().optional().describe("File path relative to the repository — for an inline (diff) comment"),
  line: z.number().int().positive().optional().describe("Line number in the diff — required with path"),
  lineType: z.enum(["new", "old"]).optional().describe("Whether the line is from the new or old version of the file"),
});

export type AddCommitCommentInput = z.infer<typeof addCommitCommentSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleAddCommitComment(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = addCommitCommentSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, sha, note, path, line, lineType } = parsed.data;
  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const comment = await client.addCommitComment(projectId, sha, { note, path, line, lineType });
    return { content: [{ type: "text", text: formatAddedComment(projectId, sha, comment) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatAddedComment(projectId: string, sha: string, comment: GitlabCommitComment): string {
  return (
    [
      `✅ **Comment added to commit ${sha.slice(0, 8)}**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **Project** | ${projectId} |`,
      `| **Location** | ${comment.path ? `${comment.path}:${comment.line ?? "?"}` : "commit-level"} |`,
      `| **Note** | ${truncate(comment.note, 500)} |`,
    ].join("\n") +
    navigationHint([`\`gitlab_list_commits(projectId: "${projectId}", ref: "${sha}")\` — view commit context`])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
