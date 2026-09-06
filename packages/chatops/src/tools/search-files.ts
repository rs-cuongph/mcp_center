import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsFileInfo } from "../types.js";

export interface SearchFilesInput {
  teamId: string;
  terms: string;
  channelId?: string;    // optional: filter to a specific channel by ID
  page?: number;
  perPage?: number;
}

function formatFile(f: ChatOpsFileInfo, index: number): string {
  const lines = [
    `${index + 1}. **${f.name}** (\`${f.extension}\`)`,
    `   - ID      : \`${f.id}\``,
    `   - Size    : ${f.sizeFormatted}`,
    `   - MIME    : ${f.mimeType}`,
  ];
  if (f.postId)    lines.push(`   - Post    : \`${f.postId}\``);
  if (f.channelId) lines.push(`   - Channel : \`${f.channelId}\``);
  if (f.createdAt) lines.push(`   - Uploaded: ${f.createdAt}`);
  return lines.join("\n");
}

export async function handleSearchFiles(
  input: SearchFilesInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const result = await client.searchFiles(input.teamId, input.terms, {
      channelId: input.channelId,
      page: input.page ?? 0,
      perPage: input.perPage ?? 20,
    });

    if (result.files.length === 0) {
      return {
        content: [{ type: "text", text: `No files found matching "${input.terms}".` }],
      };
    }

    const lines = [
      `## File Search Results: "${input.terms}" (${result.total} files)`,
      "",
      ...result.files.map(formatFile),
    ];

    lines.push("", "---", "💡 Use `chatops_get_file_info` with a file ID for full metadata, or `chatops_get_post` with the post ID to see the message context.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to search files: ${msg}`);
  }
}
