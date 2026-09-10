import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatPageFooter, formatDate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequestSummary } from "../types.js";
import type { PageMeta } from "../utils.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const listMergeRequestsSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe('Restrict to one project (numeric ID or path). Omit to list MRs assigned to you across the instance.'),
  state: z.enum(["opened", "closed", "merged", "all"]).optional().describe("Filter by state (default all)"),
  search: z.string().optional().describe("Full-text search in title and description"),
  page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  perPage: z.number().int().min(1).max(100).optional().default(20).describe("Results per page (1–100, default 20)"),
});

export type ListMergeRequestsInput = z.infer<typeof listMergeRequestsSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleListMergeRequests(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = listMergeRequestsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, state, search, page, perPage } = parsed.data;
    const { items, meta } = await client.listMergeRequests({ projectId, state, search, page, perPage });
    return { content: [{ type: "text", text: formatMrList(items, meta, projectId) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatMrList(mrs: GitlabMergeRequestSummary[], meta: PageMeta, projectId: string | undefined): string {
  const lines: string[] = [];

  lines.push(`# GitLab Merge Requests${projectId ? ` — ${projectId}` : " (assigned to you)"}`);
  lines.push(``);

  if (mrs.length === 0) {
    lines.push("_No merge requests found matching your filters._");
    return lines.join("\n");
  }

  lines.push(`| ! | Title | State | Branches | Assignees | Updated |`);
  lines.push(`|---|-------|-------|----------|-----------|---------|`);
  for (const m of mrs) {
    const state = m.draft ? `${m.state} (draft)` : m.state;
    lines.push(
      `| [!${m.iid}](${m.webUrl}) | ${m.title} | ${state} | ${m.sourceBranch} → ${m.targetBranch} | ${m.assignees.join(", ") || "Unassigned"} | ${formatDate(m.updatedAt)} |`
    );
  }

  lines.push(``);
  lines.push(formatPageFooter(meta, mrs.length));

  const hints = [
    `\`gitlab_get_merge_request(projectId: "${projectId ?? mrs[0].projectId}", iid: ${mrs[0].iid})\` — full details of the first MR`,
  ];
  if (meta.totalPages == null || meta.page < meta.totalPages) {
    hints.push(`\`gitlab_list_merge_requests(page: ${meta.page + 1})\` — next page`);
  }
  lines.push(navigationHint(hints));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
