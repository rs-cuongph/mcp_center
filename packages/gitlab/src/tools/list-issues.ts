import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatPageFooter, formatDate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabIssueSummary } from "../types.js";
import type { PageMeta } from "../utils.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const listIssuesSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe('Restrict to one project (numeric ID or path). Omit to list issues assigned to you across the instance.'),
  state: z.enum(["opened", "closed", "all"]).optional().describe("Filter by state (default all)"),
  labels: z.string().optional().describe("Comma-separated label names, e.g. \"bug,urgent\""),
  search: z.string().optional().describe("Full-text search in title and description"),
  page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  perPage: z.number().int().min(1).max(100).optional().default(20).describe("Results per page (1–100, default 20)"),
});

export type ListIssuesInput = z.infer<typeof listIssuesSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleListIssues(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = listIssuesSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, state, labels, search, page, perPage } = parsed.data;
    const { items, meta } = await client.listIssues({ projectId, state, labels, search, page, perPage });
    return { content: [{ type: "text", text: formatIssueList(items, meta, projectId) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatIssueList(issues: GitlabIssueSummary[], meta: PageMeta, projectId: string | undefined): string {
  const lines: string[] = [];

  lines.push(`# GitLab Issues${projectId ? ` — ${projectId}` : " (assigned to you)"}`);
  lines.push(``);

  if (issues.length === 0) {
    lines.push("_No issues found matching your filters._");
    return lines.join("\n");
  }

  lines.push(`| # | Title | State | Labels | Assignees | Updated |`);
  lines.push(`|---|-------|-------|--------|-----------|---------|`);
  for (const i of issues) {
    lines.push(
      `| [#${i.iid}](${i.webUrl}) | ${i.title} | ${i.state} | ${i.labels.join(", ") || "—"} | ${i.assignees.join(", ") || "Unassigned"} | ${formatDate(i.updatedAt)} |`
    );
  }

  lines.push(``);
  lines.push(formatPageFooter(meta, issues.length));

  const hints = [
    `\`gitlab_get_issue(projectId: "${projectId ?? issues[0].projectId}", iid: ${issues[0].iid})\` — full details of the first issue`,
  ];
  if (meta.totalPages == null || meta.page < meta.totalPages) {
    hints.push(`\`gitlab_list_issues(page: ${meta.page + 1})\` — next page`);
  }
  lines.push(navigationHint(hints));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
