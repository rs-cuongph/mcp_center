import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabProject } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const getProjectSchema = z.object({
  projectId: z
    .string()
    .min(1, "projectId is required")
    .describe('Numeric project ID or URL-encoded path, e.g. "123" or "mygroup/myproject"'),
});

export type GetProjectInput = z.infer<typeof getProjectSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetProject(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getProjectSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const project = await client.getProject(parsed.data.projectId);
    return { content: [{ type: "text", text: formatProject(project) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatProject(p: GitlabProject): string {
  const lines: string[] = [];

  lines.push(`# ${p.nameWithNamespace}`);
  lines.push(``);
  if (p.description) lines.push(p.description, ``);
  lines.push(`- **Path:** ${p.pathWithNamespace}`);
  lines.push(`- **Visibility:** ${p.visibility}${p.archived ? " (archived)" : ""}`);
  lines.push(`- **Default branch:** ${p.defaultBranch ?? "—"}`);
  lines.push(`- **Stars:** ${p.starCount} | **Forks:** ${p.forksCount}`);
  if (p.openIssuesCount != null) lines.push(`- **Open issues:** ${p.openIssuesCount}`);
  lines.push(`- **Last activity:** ${p.lastActivityAt}`);
  lines.push(`- **URL:** ${p.webUrl}`);

  lines.push(
    navigationHint([
      `\`gitlab_list_issues(projectId: "${p.pathWithNamespace}")\` — list issues`,
      `\`gitlab_list_merge_requests(projectId: "${p.pathWithNamespace}")\` — list merge requests`,
      `\`gitlab_list_branches(projectId: "${p.pathWithNamespace}")\` — list branches`,
    ])
  );

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
