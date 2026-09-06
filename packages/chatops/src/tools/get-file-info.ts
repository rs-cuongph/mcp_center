import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";

export interface GetFileInfoInput {
  fileId: string;
}

export async function handleGetFileInfo(
  input: GetFileInfoInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const f = await client.getFileInfo(input.fileId);

    const lines = [
      `## File: ${f.name}`,
      "",
      `- **ID**        : \`${f.id}\``,
      `- **Extension** : ${f.extension}`,
      `- **Size**      : ${f.sizeFormatted}`,
      `- **MIME type** : ${f.mimeType}`,
    ];
    if (f.postId)    lines.push(`- **Post ID**   : \`${f.postId}\``);
    if (f.channelId) lines.push(`- **Channel**   : \`${f.channelId}\``);
    if (f.createdAt) lines.push(`- **Uploaded**  : ${f.createdAt}`);
    if (f.postId) lines.push("", "---", `💡 Use \`chatops_get_post\` with postId \`${f.postId}\` to see the message this file was attached to.`);
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get file info for "${input.fileId}": ${msg}`);
  }
}
