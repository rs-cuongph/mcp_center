import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, parseLabels } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabMergeRequest } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const createMergeRequestSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  sourceBranch: z.string().min(1, "sourceBranch is required").describe("Branch containing the changes"),
  targetBranch: z.string().min(1, "targetBranch is required").describe("Branch the changes should merge into"),
  title: z.string().min(1, "title is required").describe("Merge request title"),
  description: z.string().optional().describe("Merge request description (Markdown supported by GitLab)"),
  assigneeIds: z.array(z.number().int().positive()).optional().describe("User IDs to assign the MR to"),
  reviewerIds: z.array(z.number().int().positive()).optional().describe("User IDs to request review from"),
  labels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Labels to apply — array of label names or a comma-separated string, e.g. "bug,urgent"'),
  removeSourceBranch: z.boolean().optional().describe("Delete the source branch when the MR is merged"),
  squash: z.boolean().optional().describe("Squash commits when the MR is merged"),
});

export type CreateMergeRequestInput = z.infer<typeof createMergeRequestSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleCreateMergeRequest(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = createMergeRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { projectId, sourceBranch, targetBranch, title, description, assigneeIds, reviewerIds, labels, removeSourceBranch, squash } =
    parsed.data;
  const labelList = parseLabels(labels);

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const mr = await client.createMergeRequest(projectId, {
      sourceBranch,
      targetBranch,
      title,
      description,
      assigneeIds,
      reviewerIds,
      labels: labelList,
      removeSourceBranch,
      squash,
    });
    return { content: [{ type: "text", text: formatCreatedMr(mr) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatCreatedMr(mr: GitlabMergeRequest): string {
  return (
    [
      `✅ **Merge request created**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| **MR** | !${mr.iid} ${mr.title} |`,
      `| **State** | ${mr.state} |`,
      `| **Branches** | ${mr.sourceBranch} → ${mr.targetBranch} |`,
      `| **URL** | ${mr.webUrl} |`,
    ].join("\n") +
    navigationHint([
      `\`gitlab_get_merge_request(projectId: "${mr.projectId}", iid: ${mr.iid})\` — view the new merge request`,
    ])
  );
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
