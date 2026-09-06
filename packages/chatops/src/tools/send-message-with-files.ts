import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";

export interface SendMessageWithFilesInput {
  channelId: string;
  message: string;
  fileIds: string[];
  rootPostId?: string;
}

export async function handleSendMessageWithFiles(
  input: SendMessageWithFilesInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  if (!input.fileIds.length) {
    return errorContent("fileIds must not be empty. Use chatops_send_message for text-only messages.");
  }

  const client = await createClient(cfg);
  try {
    const post = await client.createPost(
      input.channelId,
      input.message,
      input.rootPostId,
      input.fileIds
    );

    const lines = [
      "## ✅ Message with files sent",
      "",
      `- **Post ID**: \`${post.id}\``,
      `- **Channel**: \`${post.channelId}\``,
      `- **Attachments**: ${post.fileIds.length} file(s)`,
      `- **Sent at**: ${post.createdAt}`,
      "",
      `> ${post.message.slice(0, 200)}${post.message.length > 200 ? "…" : ""}`,
    ];
    if (post.files.length) {
      lines.push("");
      lines.push("**Attached files:**");
      post.files.forEach((f, i) => {
        lines.push(`${i + 1}. ${f.name} (${f.sizeFormatted}) — \`${f.id}\``);
      });
    }
    lines.push("", "---", `💡 Use \`chatops_reply_to_thread\` with rootPostId \`${post.id}\` to continue the thread, or \`chatops_get_post\` to verify the message.`);
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to send message with files: ${msg}`);
  }
}
