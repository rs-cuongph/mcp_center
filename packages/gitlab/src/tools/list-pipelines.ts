import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatPageFooter, formatDate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabPipeline } from "../types.js";
import type { PageMeta } from "../utils.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const listPipelinesSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  ref: z.string().optional().describe("Filter by branch or tag"),
  status: z
    .enum([
      "created", "waiting_for_resource", "preparing", "pending", "running",
      "success", "failed", "canceled", "skipped", "manual", "scheduled",
    ])
    .optional()
    .describe("Filter by pipeline status"),
  page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  perPage: z.number().int().min(1).max(100).optional().default(20).describe("Results per page (1–100, default 20)"),
});

export type ListPipelinesInput = z.infer<typeof listPipelinesSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleListPipelines(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = listPipelinesSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, ref, status, page, perPage } = parsed.data;
    const { items, meta } = await client.listPipelines(projectId, { ref, status, page, perPage });
    return { content: [{ type: "text", text: formatPipelineList(items, meta, projectId) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatPipelineList(pipelines: GitlabPipeline[], meta: PageMeta, projectId: string): string {
  const lines: string[] = [];

  lines.push(`# Pipelines — ${projectId}`);
  lines.push(``);

  if (pipelines.length === 0) {
    lines.push("_No pipelines found matching your filters._");
    return lines.join("\n");
  }

  lines.push(`| ID | Status | Ref | Source | Updated |`);
  lines.push(`|----|--------|-----|--------|---------|`);
  for (const p of pipelines) {
    lines.push(`| [${p.id}](${p.webUrl}) | ${p.status} | ${p.ref} | ${p.source} | ${formatDate(p.updatedAt)} |`);
  }

  lines.push(``);
  lines.push(formatPageFooter(meta, pipelines.length));

  const hints = [`\`gitlab_get_pipeline(projectId: "${projectId}", pipelineId: ${pipelines[0].id})\` — jobs for the first pipeline`];
  if (meta.totalPages == null || meta.page < meta.totalPages) {
    hints.push(`\`gitlab_list_pipelines(projectId: "${projectId}", page: ${meta.page + 1})\` — next page`);
  }
  lines.push(navigationHint(hints));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
