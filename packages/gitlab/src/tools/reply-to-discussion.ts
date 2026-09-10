import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, truncate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabNote } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const replyToDiscussionSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  noteableType: z.enum(["issue", "merge_request"]).describe("Whether the discussion belongs to an issue or a merge request"),
  iid: z.number().int().positive().describe("Internal ID of the issue or merge request the discussion belongs to"),
  discussionId: z.string().min(1, "discussionId is required").describe("Discussion (thread) ID to reply to"),
  body: z.string().min(1, "body is required").describe("Reply text (Markdown supported by GitLab)"),
});

export type ReplyToDiscussionInput = z.infer<typeof replyToDiscussionSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleReplyToDiscussion(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = replyToDiscussionSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, noteableType, iid, discussionId, body } = parsed.data;
  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const note = await client.replyToDiscussion(projectId, noteableType, iid, discussionId, body);
    return { content: [{ type: "text", text: formatReply(projectId, noteableType, iid, discussionId, note) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatReply(
  projectId: string,
  noteableType: "issue" | "merge_request",
  iid: number,
  discussionId: string,
  note: GitlabNote
): string {
  const marker = noteableType === "issue" ? `#${iid}` : `!${iid}`;
  const getTool = noteableType === "issue" ? "gitlab_get_issue" : "gitlab_get_merge_request";
  return (
    [
      `✅ **Reply added to discussion on ${marker}**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **Project** | ${projectId} |`,
      `| **Discussion** | ${discussionId} |`,
      `| **Note ID** | ${note.id} |`,
      `| **Body** | ${truncate(note.body, 500)} |`,
    ].join("\n") +
    navigationHint([`\`${getTool}(projectId: "${projectId}", iid: ${iid})\` — view the full thread`])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
