import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, parseLabels } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabIssue } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const updateIssueSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  issueIid: z.number().int().positive().describe("Issue internal ID (the number shown in the UI, e.g. #42 → 42)"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description (Markdown supported by GitLab)"),
  stateEvent: z.enum(["close", "reopen"]).optional().describe("Close or reopen the issue"),
  labels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Replace all labels — array of label names or a comma-separated string"),
  addLabels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Labels to add, keeping existing labels — array or comma-separated string"),
  removeLabels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Labels to remove, keeping the rest — array or comma-separated string"),
  assigneeIds: z.array(z.number().int().positive()).optional().describe("Replace assignees with these user IDs"),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleUpdateIssue(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = updateIssueSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, issueIid, title, description, stateEvent, labels, addLabels, removeLabels, assigneeIds } = parsed.data;

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const issue = await client.updateIssue(projectId, issueIid, {
      title,
      description,
      stateEvent,
      labels: parseLabels(labels),
      addLabels: parseLabels(addLabels),
      removeLabels: parseLabels(removeLabels),
      assigneeIds,
    });
    return { content: [{ type: "text", text: formatUpdatedIssue(issue) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatUpdatedIssue(issue: GitlabIssue): string {
  return (
    [
      `✅ **Issue updated**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **Issue** | #${issue.iid} ${issue.title} |`,
      `| **State** | ${issue.state} |`,
      `| **Labels** | ${issue.labels.join(", ") || "—"} |`,
      `| **URL** | ${issue.webUrl} |`,
    ].join("\n") +
    navigationHint([`\`gitlab_get_issue(projectId: "${issue.projectId}", iid: ${issue.iid})\` — view the updated issue`])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
