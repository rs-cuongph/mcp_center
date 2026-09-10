import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabIssue } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const createIssueSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  title: z.string().min(1, "title is required").describe("Issue title"),
  description: z.string().optional().describe("Issue description (Markdown supported by GitLab)"),
  labels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Labels to apply — array of label names or a comma-separated string, e.g. "bug,urgent"'),
  assigneeIds: z.array(z.number().int().positive()).optional().describe("User IDs to assign the issue to"),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleCreateIssue(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = createIssueSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, title, description, labels, assigneeIds } = parsed.data;
  const labelList = labels == null ? undefined : Array.isArray(labels) ? labels : labels.split(",").map((l) => l.trim()).filter(Boolean);

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const issue = await client.createIssue(projectId, { title, description, labels: labelList, assigneeIds });
    return { content: [{ type: "text", text: formatCreatedIssue(issue) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatCreatedIssue(issue: GitlabIssue): string {
  return (
    [
      `✅ **Issue created**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **Issue** | #${issue.iid} ${issue.title} |`,
      `| **State** | ${issue.state} |`,
      `| **URL** | ${issue.webUrl} |`,
    ].join("\n") +
    navigationHint([
      `\`gitlab_get_issue(projectId: "${issue.projectId}", iid: ${issue.iid})\` — view the new issue`,
    ])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
