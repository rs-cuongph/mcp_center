import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";

export interface SendMessageInput {
  channelId: string;
  message: string;
}

export async function handleSendMessage(
  input: SendMessageInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const post = await client.createPost(input.channelId, input.message);

    const lines = [
      "## ✅ Message sent",
      "",
      `- **Post ID**: \`${post.id}\``,
      `- **Channel**: \`${post.channelId}\``,
      `- **Sent at**: ${post.createdAt}`,
      "",
      `> ${post.message.slice(0, 200)}${post.message.length > 200 ? "…" : ""}`,
      "",
      "---",
      `💡 Use \`chatops_reply_to_thread\` with rootPostId \`${post.id}\` to start a thread, or \`chatops_add_reaction\` to react to this message.`,
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to send message: ${msg}`);
  }
}
