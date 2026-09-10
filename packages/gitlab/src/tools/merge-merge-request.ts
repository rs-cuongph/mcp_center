import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequest } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const mergeMergeRequestSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  mergeRequestIid: z
    .number()
    .int()
    .positive()
    .describe("Merge request internal ID (the number shown in the UI, e.g. !42 → 42)"),
  mergeCommitMessage: z.string().optional().describe("Custom merge commit message"),
  squash: z.boolean().optional().describe("Squash commits before merging"),
  shouldRemoveSourceBranch: z.boolean().optional().describe("Delete the source branch after merging"),
  mergeWhenPipelineSucceeds: z.boolean().optional().describe("Merge automatically once the pipeline succeeds"),
  sha: z
    .string()
    .optional()
    .describe("If given, merges only if the MR's current HEAD SHA matches this (optimistic concurrency check)"),
});

export type MergeMergeRequestInput = z.infer<typeof mergeMergeRequestSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleMergeMergeRequest(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = mergeMergeRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, mergeRequestIid, mergeCommitMessage, squash, shouldRemoveSourceBranch, mergeWhenPipelineSucceeds, sha } =
    parsed.data;

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const mr = await client.mergeMergeRequest(projectId, mergeRequestIid, {
      mergeCommitMessage,
      squash,
      shouldRemoveSourceBranch,
      mergeWhenPipelineSucceeds,
      sha,
    });
    return { content: [{ type: "text", text: formatMergedMr(mr) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatMergedMr(mr: GitlabMergeRequest): string {
  return (
    [
      `✅ **Merge request !${mr.iid} — ${mr.state}**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **Title** | ${mr.title} |`,
      `| **Merged at** | ${mr.mergedAt ?? "pending (merge_when_pipeline_succeeds)"} |`,
      `| **URL** | ${mr.webUrl} |`,
    ].join("\n") +
    navigationHint([`\`gitlab_get_merge_request(projectId: "${mr.projectId}", iid: ${mr.iid})\` — view the merge result`])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
