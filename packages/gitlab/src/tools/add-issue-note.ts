import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, truncate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabNote } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const addIssueNoteSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  issueIid: z.number().int().positive().describe("Issue internal ID (the number shown in the UI, e.g. #42 → 42)"),
  body: z.string().min(1, "body is required").describe("Comment text (Markdown supported by GitLab)"),
});

export type AddIssueNoteInput = z.infer<typeof addIssueNoteSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleAddIssueNote(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = addIssueNoteSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, issueIid, body } = parsed.data;
  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const note = await client.addIssueNote(projectId, issueIid, body);
    return { content: [{ type: "text", text: formatAddedNote(projectId, issueIid, note) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatAddedNote(projectId: string, issueIid: number, note: GitlabNote): string {
  return (
    [
      `✅ **Note added to issue #${issueIid}**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **Project** | ${projectId} |`,
      `| **Note ID** | ${note.id} |`,
      `| **Body** | ${truncate(note.body, 500)} |`,
    ].join("\n") +
    navigationHint([`\`gitlab_get_issue(projectId: "${projectId}", iid: ${issueIid})\` — view all comments`])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
