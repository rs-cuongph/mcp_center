import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint, formatSize } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabFile } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const getFileSchema = z.object({
  projectId: z.string().min(1, "projectId is required").describe("Numeric project ID or path"),
  filePath: z.string().min(1, "filePath is required").describe('Repository-relative file path, e.g. "src/index.ts"'),
  ref: z.string().min(1).optional().default("main").describe("Branch, tag, or SHA (default: main)"),
});

export type GetFileInput = z.infer<typeof getFileSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetFile(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getFileSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const { projectId, filePath, ref } = parsed.data;
    const file = await client.getFile(projectId, filePath, ref);
    return { content: [{ type: "text", text: formatFile(file, projectId) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatFile(file: GitlabFile, projectId: string): string {
  const lines: string[] = [];
  const ext = file.filePath.split(".").pop() ?? "";

  lines.push(`# ${file.filePath}`);
  lines.push(``);
  lines.push(`- **Ref:** ${file.ref}`);
  lines.push(`- **Size:** ${formatSize(file.size)}`);
  lines.push(``);

  if (file.binary) {
    lines.push(`_Binary file — content not embedded to avoid token cost._`);
  } else if (file.truncated || file.content == null) {
    lines.push(
      `_File is ${formatSize(file.size)}, above the inline limit — content not embedded. Fetch it outside the MCP session if you need the full contents._`
    );
  } else {
    lines.push("```" + ext);
    lines.push(file.content);
    lines.push("```");
  }

  lines.push(
    navigationHint([`\`gitlab_list_commits(projectId: "${projectId}", ref: "${file.ref}")\` — recent history for this ref`])
  );

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
