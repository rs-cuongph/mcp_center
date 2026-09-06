import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";

export interface GetChannelInput {
  /** Channel ID (preferred) */
  channelId?: string;
  /** Team ID — required when looking up by name */
  teamId?: string;
  /** Channel name/slug — used only when channelId is not provided */
  channelName?: string;
}

export async function handleGetChannel(
  input: GetChannelInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  if (!input.channelId && !(input.teamId && input.channelName)) {
    return errorContent(
      "Provide either channelId, or both teamId and channelName."
    );
  }

  const client = await createClient(cfg);
  try {
    const c = input.channelId
      ? await client.getChannel(input.channelId)
      : await client.getChannelByName(input.teamId!, input.channelName!);

    const icon = c.type === "private" ? "🔒" : c.type === "direct" ? "💬" : "#";
    const lines = [
      `## ${icon} ${c.displayName}`,
      "",
      `- **ID**: \`${c.id}\``,
      `- **Name (slug)**: \`${c.name}\``,
      `- **Team ID**: \`${c.teamId}\``,
      `- **Type**: ${c.type}`,
      `- **Total messages**: ${c.totalMsgCount}`,
      `- **Last post**: ${c.lastPostAt || "N/A"}`,
    ];
    if (c.purpose) lines.push(`- **Purpose**: ${c.purpose}`);
    if (c.header) lines.push(`- **Header**: ${c.header}`);
    lines.push("", "---", "💡 Use `chatops_get_channel_posts` to read messages, or `chatops_get_pinned_posts` for pinned content in this channel.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get channel: ${msg}`);
  }
}
