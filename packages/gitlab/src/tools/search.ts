import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { truncate } from "../utils.js";
import type { Config } from "../config.js";
import type {
  GitlabProject,
  GitlabIssueSummary,
  GitlabMergeRequestSummary,
  GitlabCommit,
  GitlabBlobSearchResult,
} from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const searchSchema = z.object({
  scope: z
    .enum(["projects", "issues", "merge_requests", "blobs", "commits"])
    .describe("What to search: projects | issues | merge_requests | blobs | commits"),
  search: z.string().min(1, "search is required").describe("Search query"),
  projectId: z
    .string()
    .optional()
    .describe("Scope the search to one project (numeric ID or path). Omit for an instance-wide search."),
});

export type SearchInput = z.infer<typeof searchSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleSearch(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = searchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { scope, search, projectId } = parsed.data;
    const result = await client.search({ scope, search, projectId });
    return { content: [{ type: "text", text: formatSearchResult(scope, search, result) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatSearchResult(
  scope: SearchInput["scope"],
  search: string,
  result: {
    projects?: GitlabProject[];
    issues?: GitlabIssueSummary[];
    mergeRequests?: GitlabMergeRequestSummary[];
    commits?: GitlabCommit[];
    blobs?: GitlabBlobSearchResult[];
  }
): string {
  const lines: string[] = [`# GitLab Search: "${search}" (scope: ${scope})`, ``];

  if (result.projects) {
    if (result.projects.length === 0) lines.push("_No projects found._");
    for (const p of result.projects) {
      lines.push(`- [${p.pathWithNamespace}](${p.webUrl}) — ${p.visibility}`);
    }
  } else if (result.issues) {
    if (result.issues.length === 0) lines.push("_No issues found._");
    for (const i of result.issues) {
      lines.push(`- [#${i.iid}](${i.webUrl}) ${i.title} (${i.state})`);
    }
  } else if (result.mergeRequests) {
    if (result.mergeRequests.length === 0) lines.push("_No merge requests found._");
    for (const m of result.mergeRequests) {
      lines.push(`- [!${m.iid}](${m.webUrl}) ${m.title} (${m.state})`);
    }
  } else if (result.commits) {
    if (result.commits.length === 0) lines.push("_No commits found._");
    for (const c of result.commits) {
      lines.push(`- [${c.shortId}](${c.webUrl}) ${truncate(c.title, 100)}`);
    }
  } else if (result.blobs) {
    if (result.blobs.length === 0) lines.push("_No matching files found._");
    for (const b of result.blobs) {
      lines.push(`- **${b.path}** (project ${b.projectId}, ref ${b.ref}, line ${b.startLine})`);
      lines.push("```");
      lines.push(truncate(b.snippet, 500));
      lines.push("```");
    }
  }

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
