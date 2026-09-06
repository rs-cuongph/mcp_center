import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsPost } from "../types.js";

export interface GetPostInput {
  postId: string;
}

export async function handleGetPost(
  input: GetPostInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const p = await client.getPost(input.postId);

    // Resolve author username
    let authorLabel = `\`${p.userId}\``;
    try {
      const user = await client.getUser(p.userId);
      authorLabel = `@${user.username} (${user.displayName})`;
    } catch { /* keep raw ID */ }

    const lines = [
      `## Post \`${p.id}\``,
      "",
      `- **Author**  : ${authorLabel}`,
      `- **Channel** : \`${p.channelId}\``,
      `- **Created** : ${p.createdAt}`,
      `- **Updated** : ${p.updatedAt}`,
    ];
    if (p.rootId) lines.push(`- **Thread**  : reply to \`${p.rootId}\``);
    if (p.fileIds.length) lines.push(`- **Files**   : ${p.fileIds.length} attachment(s) — ${p.fileIds.map(id => `\`${id}\``).join(", ")}`);
    lines.push("", "### Message", "", p.message);
    lines.push("", "---", "💡 Use `chatops_get_thread` to see the full conversation around this post.");

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get post "${input.postId}": ${msg}`);
  }
}
