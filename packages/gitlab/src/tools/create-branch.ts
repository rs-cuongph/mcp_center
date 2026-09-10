import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabBranch } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const createBranchSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  branch: z.string().min(1, "branch is required").describe("Name of the new branch"),
  ref: z.string().min(1, "ref is required").describe("Branch name, tag, or commit SHA to create the branch from"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleCreateBranch(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = createBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, branch, ref } = parsed.data;
  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const created = await client.createBranch(projectId, branch, ref);
    return { content: [{ type: "text", text: formatCreatedBranch(projectId, created) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatCreatedBranch(projectId: string, branch: GitlabBranch): string {
  return (
    [
      `✅ **Branch created**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **Branch** | ${branch.name} |`,
      `| **From commit** | ${branch.commitShortId} — ${branch.commitTitle} |`,
      `| **URL** | ${branch.webUrl} |`,
    ].join("\n") +
    navigationHint([`\`gitlab_list_branches(projectId: "${projectId}", search: "${branch.name}")\` — confirm it landed`])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
