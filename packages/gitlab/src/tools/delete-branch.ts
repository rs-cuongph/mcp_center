import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const deleteBranchSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  branch: z.string().min(1, "branch is required").describe("Name of the branch to delete"),
});

export type DeleteBranchInput = z.infer<typeof deleteBranchSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleDeleteBranch(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = deleteBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, branch } = parsed.data;
  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    await client.deleteBranch(projectId, branch);
    return {
      content: [
        {
          type: "text",
          text: `✅ **Branch deleted**\n\n| Field | Value |\n|---|---|\n| **Project** | ${projectId} |\n| **Branch** | ${branch} |`,
        },
      ],
    };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
