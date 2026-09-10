import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatPageFooter } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabProject } from "../types.js";
import type { PageMeta } from "../utils.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const listProjectsSchema = z.object({
  search: z.string().optional().describe("Search projects by name/path"),
  membership: z
    .boolean()
    .optional()
    .default(true)
    .describe("Only projects the authenticated user is a member of (default true)"),
  orderBy: z
    .enum(["id", "name", "path", "created_at", "updated_at", "last_activity_at"])
    .optional()
    .describe("Sort field (default last_activity_at)"),
  page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  perPage: z.number().int().min(1).max(100).optional().default(20).describe("Results per page (1–100, default 20)"),
});

export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleListProjects(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = listProjectsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { search, membership, orderBy, page, perPage } = parsed.data;
    const { items, meta } = await client.listProjects({ search, membership, orderBy, page, perPage });
    return { content: [{ type: "text", text: formatProjectList(items, meta) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatProjectList(projects: GitlabProject[], meta: PageMeta): string {
  const lines: string[] = [];

  lines.push(`# GitLab Projects`);
  lines.push(``);

  if (projects.length === 0) {
    lines.push("_No projects found matching your filters._");
    return lines.join("\n");
  }

  lines.push(`| Project | Visibility | Default Branch | ★ | Last Activity |`);
  lines.push(`|---------|------------|-----------------|---|----------------|`);
  for (const p of projects) {
    lines.push(
      `| [${p.pathWithNamespace}](${p.webUrl})${p.archived ? " _(archived)_" : ""} | ${p.visibility} | ${p.defaultBranch ?? "—"} | ${p.starCount} | ${p.lastActivityAt} |`
    );
  }

  lines.push(``);
  lines.push(formatPageFooter(meta, projects.length));

  const hints = [
    `\`gitlab_get_project(projectId: "${projects[0].pathWithNamespace}")\` — full details of the first project`,
  ];
  if (meta.totalPages == null || meta.page < meta.totalPages) {
    hints.push(`\`gitlab_list_projects(page: ${meta.page + 1})\` — next page`);
  }
  lines.push(navigationHint(hints));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
