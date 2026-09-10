import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatDate, truncate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabIssue, GitlabNote } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const getIssueSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  iid: z.number().int().positive().describe("Issue internal ID (the number shown in the UI, e.g. #42 → 42)"),
});

export type GetIssueInput = z.infer<typeof getIssueSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetIssue(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getIssueSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, iid } = parsed.data;
    const issue = await client.getIssue(projectId, iid);
    const notesPage = await client.getIssueNotes(projectId, iid, 20);
    return { content: [{ type: "text", text: formatIssue(issue, notesPage.items, notesPage.meta.total) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatIssue(issue: GitlabIssue, notes: GitlabNote[], totalNotes: number | undefined): string {
  const lines: string[] = [];

  lines.push(`# #${issue.iid} ${issue.title}`);
  lines.push(``);
  lines.push(`- **State:** ${issue.state}${issue.confidential ? " (confidential)" : ""}`);
  lines.push(`- **Author:** ${issue.author}`);
  lines.push(`- **Assignees:** ${issue.assignees.join(", ") || "Unassigned"}`);
  if (issue.milestone) lines.push(`- **Milestone:** ${issue.milestone}`);
  if (issue.labels.length > 0) lines.push(`- **Labels:** ${issue.labels.join(", ")}`);
  if (issue.dueDate) lines.push(`- **Due:** ${issue.dueDate}`);
  lines.push(`- **Created:** ${formatDate(issue.createdAt)} | **Updated:** ${formatDate(issue.updatedAt)}`);
  if (issue.closedAt) lines.push(`- **Closed:** ${formatDate(issue.closedAt)}`);
  lines.push(`- **URL:** ${issue.webUrl}`);
  lines.push(``);

  if (issue.description) {
    lines.push(`## Description`);
    lines.push(``);
    lines.push(issue.description);
    lines.push(``);
  }

  const visibleNotes = notes.filter((n) => !n.system);
  lines.push(`## Notes (${visibleNotes.length}${totalNotes != null ? ` of ${totalNotes}` : ""})`);
  lines.push(``);
  if (visibleNotes.length === 0) {
    lines.push("_No comments yet._");
  } else {
    for (const note of visibleNotes) {
      lines.push(`**${note.author}** — ${formatDate(note.createdAt)}`);
      lines.push(truncate(note.body, 2000));
      lines.push(``);
    }
  }

  lines.push(
    navigationHint([
      `\`gitlab_list_merge_requests(projectId: "${issue.projectId}", search: "#${issue.iid}")\` — find related MRs`,
    ])
  );

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
