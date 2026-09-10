import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatPageFooter, truncate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabCommit } from "../types.js";
import type { PageMeta } from "../utils.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const listCommitsSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  ref: z.string().optional().describe("Branch, tag, or SHA (default: the project's default branch)"),
  since: z.string().optional().describe("ISO 8601 date — only commits after this date"),
  until: z.string().optional().describe("ISO 8601 date — only commits before this date"),
  page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  perPage: z.number().int().min(1).max(100).optional().default(20).describe("Results per page (1–100, default 20)"),
});

export type ListCommitsInput = z.infer<typeof listCommitsSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleListCommits(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = listCommitsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, ref, since, until, page, perPage } = parsed.data;
    const { items, meta } = await client.listCommits(projectId, { ref, since, until, page, perPage });
    return { content: [{ type: "text", text: formatCommitList(items, meta, projectId) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatCommitList(commits: GitlabCommit[], meta: PageMeta, projectId: string): string {
  const lines: string[] = [];

  lines.push(`# Commits — ${projectId}`);
  lines.push(``);

  if (commits.length === 0) {
    lines.push("_No commits found matching your filters._");
    return lines.join("\n");
  }

  lines.push(`| SHA | Message | Author | Date |`);
  lines.push(`|-----|---------|--------|------|`);
  for (const c of commits) {
    lines.push(`| [${c.shortId}](${c.webUrl}) | ${truncate(c.title, 80)} | ${c.authorName} | ${c.authoredDate} |`);
  }

  lines.push(``);
  lines.push(formatPageFooter(meta, commits.length));

  const hints: string[] = [];
  if (meta.totalPages == null || meta.page < meta.totalPages) {
    hints.push(`\`gitlab_list_commits(projectId: "${projectId}", page: ${meta.page + 1})\` — next page`);
  }
  if (hints.length > 0) lines.push(navigationHint(hints));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
