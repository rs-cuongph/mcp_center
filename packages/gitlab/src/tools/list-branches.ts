import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatPageFooter } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabBranch } from "../types.js";
import type { PageMeta } from "../utils.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const listBranchesSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  search: z.string().optional().describe("Filter branches by name substring"),
  page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  perPage: z.number().int().min(1).max(100).optional().default(20).describe("Results per page (1–100, default 20)"),
});

export type ListBranchesInput = z.infer<typeof listBranchesSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleListBranches(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = listBranchesSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, search, page, perPage } = parsed.data;
    const { items, meta } = await client.listBranches(projectId, { search, page, perPage });
    return { content: [{ type: "text", text: formatBranchList(items, meta, projectId) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatBranchList(branches: GitlabBranch[], meta: PageMeta, projectId: string): string {
  const lines: string[] = [];

  lines.push(`# Branches — ${projectId}`);
  lines.push(``);

  if (branches.length === 0) {
    lines.push("_No branches found matching your filters._");
    return lines.join("\n");
  }

  lines.push(`| Branch | Last Commit | Protected | Merged |`);
  lines.push(`|--------|--------------|-----------|--------|`);
  for (const b of branches) {
    lines.push(
      `| [${b.name}](${b.webUrl})${b.default ? " (default)" : ""} | ${b.commitShortId} ${b.commitTitle} | ${b.protected ? "yes" : "no"} | ${b.merged ? "yes" : "no"} |`
    );
  }

  lines.push(``);
  lines.push(formatPageFooter(meta, branches.length));

  const hints = [`\`gitlab_list_commits(projectId: "${projectId}", ref: "${branches[0].name}")\` — commits on the first branch`];
  if (meta.totalPages == null || meta.page < meta.totalPages) {
    hints.push(`\`gitlab_list_branches(projectId: "${projectId}", page: ${meta.page + 1})\` — next page`);
  }
  lines.push(navigationHint(hints));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
