import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatDate, truncate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequest, GitlabDiscussion, GitlabMrChangeSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const getMergeRequestSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  iid: z.number().int().positive().describe("Merge request internal ID (the number shown in the UI, e.g. !42 → 42)"),
});

export type GetMergeRequestInput = z.infer<typeof getMergeRequestSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetMergeRequest(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getMergeRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, iid } = parsed.data;
    const mr = await client.getMergeRequest(projectId, iid);
    const discussionsPage = await client.getMergeRequestDiscussions(projectId, iid, 20);
    const changes = await client.getMergeRequestChanges(projectId, iid);
    return {
      content: [{ type: "text", text: formatMergeRequest(mr, discussionsPage.items, changes) }],
    };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatMergeRequest(
  mr: GitlabMergeRequest,
  discussions: GitlabDiscussion[],
  changes: GitlabMrChangeSummary[]
): string {
  const lines: string[] = [];

  lines.push(`# !${mr.iid} ${mr.title}${mr.draft ? " (Draft)" : ""}`);
  lines.push(``);
  lines.push(`- **State:** ${mr.state} | **Merge status:** ${mr.mergeStatus}${mr.hasConflicts ? " (conflicts)" : ""}`);
  lines.push(`- **Branches:** ${mr.sourceBranch} → ${mr.targetBranch}`);
  lines.push(`- **Author:** ${mr.author}`);
  lines.push(`- **Assignees:** ${mr.assignees.join(", ") || "Unassigned"}`);
  if (mr.labels.length > 0) lines.push(`- **Labels:** ${mr.labels.join(", ")}`);
  lines.push(`- **Created:** ${formatDate(mr.createdAt)} | **Updated:** ${formatDate(mr.updatedAt)}`);
  if (mr.mergedAt) lines.push(`- **Merged:** ${formatDate(mr.mergedAt)}`);
  if (mr.closedAt) lines.push(`- **Closed:** ${formatDate(mr.closedAt)}`);
  lines.push(`- **URL:** ${mr.webUrl}`);
  lines.push(``);

  if (mr.description) {
    lines.push(`## Description`);
    lines.push(``);
    lines.push(mr.description);
    lines.push(``);
  }

  lines.push(`## Changed Files (${changes.length})`);
  lines.push(``);
  if (changes.length === 0) {
    lines.push("_No changed files reported._");
  } else {
    for (const c of changes) {
      const tag = c.isNew ? " (new)" : c.isDeleted ? " (deleted)" : c.isRenamed ? " (renamed)" : "";
      lines.push(`- \`${c.path}\`${tag} — +${c.additions} / -${c.deletions}`);
    }
  }
  lines.push(``);

  const visibleDiscussions = discussions.filter((d) => d.notes.some((n) => !n.system));
  lines.push(`## Discussions (${visibleDiscussions.length})`);
  lines.push(``);
  if (visibleDiscussions.length === 0) {
    lines.push("_No review discussions yet._");
  } else {
    for (const d of visibleDiscussions) {
      for (const note of d.notes.filter((n) => !n.system)) {
        lines.push(`**${note.author}** — ${formatDate(note.createdAt)}`);
        lines.push(truncate(note.body, 1000));
        lines.push(``);
      }
    }
  }

  lines.push(navigationHint([`\`gitlab_list_pipelines(projectId: "${mr.projectId}", ref: "${mr.sourceBranch}")\` — CI status for this branch`]));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
