import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabCommit } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const commitFileSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  branch: z.string().min(1, "branch is required").describe("Branch to commit to"),
  commitMessage: z.string().min(1, "commitMessage is required").describe("Commit message"),
  action: z.enum(["create", "update", "delete"]).describe("File action"),
  filePath: z.string().min(1, "filePath is required").describe("Path of the file relative to the repository root"),
  content: z.string().optional().describe("New file content — required for create/update, ignored for delete"),
  encoding: z.enum(["text", "base64"]).optional().describe("Encoding of `content` (default text)"),
  startBranch: z
    .string()
    .optional()
    .describe("Create `branch` from this ref before committing, if `branch` does not exist yet"),
});

export type CommitFileInput = z.infer<typeof commitFileSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleCommitFile(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = commitFileSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, branch, commitMessage, action, filePath, content, encoding, startBranch } = parsed.data;
  if (action !== "delete" && content === undefined) {
    return errorContent("Invalid input: content is required when action is create or update");
  }
  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const commit = await client.commitFile(projectId, {
      branch,
      commitMessage,
      action,
      filePath,
      content,
      encoding,
      startBranch,
    });
    return { content: [{ type: "text", text: formatCommit(projectId, action, filePath, commit) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatCommit(projectId: string, action: string, filePath: string, commit: GitlabCommit): string {
  return (
    [
      `✅ **File ${action}d — commit created**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **File** | ${filePath} |`,
      `| **Commit** | ${commit.shortId} — ${commit.title} |`,
      `| **URL** | ${commit.webUrl} |`,
    ].join("\n") +
    navigationHint([`\`gitlab_get_file(projectId: "${projectId}", filePath: "${filePath}", ref: "${commit.id}")\` — view the result`])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
