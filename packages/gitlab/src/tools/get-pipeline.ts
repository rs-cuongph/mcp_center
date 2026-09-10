import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatDate } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabPipeline, GitlabJob } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const getPipelineSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  pipelineId: z.number().int().positive().describe("Pipeline ID (not the iid shown in some UIs — the numeric id)"),
});

export type GetPipelineInput = z.infer<typeof getPipelineSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetPipeline(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getPipelineSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, pipelineId } = parsed.data;
    const pipeline = await client.getPipeline(projectId, pipelineId);
    const jobs = await client.getPipelineJobs(projectId, pipelineId);
    return { content: [{ type: "text", text: formatPipeline(pipeline, jobs) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatPipeline(pipeline: GitlabPipeline, jobs: GitlabJob[]): string {
  const lines: string[] = [];

  lines.push(`# Pipeline #${pipeline.id} — ${pipeline.status}`);
  lines.push(``);
  lines.push(`- **Ref:** ${pipeline.ref} | **SHA:** ${pipeline.sha.slice(0, 8)}`);
  lines.push(`- **Source:** ${pipeline.source}`);
  if (pipeline.duration != null) lines.push(`- **Duration:** ${pipeline.duration}s`);
  lines.push(`- **Created:** ${formatDate(pipeline.createdAt)} | **Updated:** ${formatDate(pipeline.updatedAt)}`);
  lines.push(`- **URL:** ${pipeline.webUrl}`);
  lines.push(``);

  lines.push(`## Jobs (${jobs.length})`);
  lines.push(``);
  if (jobs.length === 0) {
    lines.push("_No jobs reported for this pipeline._");
  } else {
    lines.push(`| Stage | Job | Status | Duration |`);
    lines.push(`|-------|-----|--------|----------|`);
    for (const j of jobs) {
      lines.push(`| ${j.stage} | [${j.name}](${j.webUrl}) | ${j.status} | ${j.duration != null ? `${j.duration}s` : "—"} |`);
    }
  }

  lines.push(navigationHint([`\`gitlab_list_pipelines(projectId: "${pipeline.projectId}", ref: "${pipeline.ref}")\` — pipeline history for this ref`]));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
