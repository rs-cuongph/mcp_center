import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsChannel } from "../types.js";

export interface SearchChannelsInput {
  teamId: string;
  term: string;
}

function formatChannel(c: ChatOpsChannel, index: number): string {
  const icon = c.type === "private" ? "🔒" : "#";
  const lines = [
    `${index + 1}. ${icon} **${c.displayName}** (\`${c.name}\`)`,
    `   - ID: \`${c.id}\``,
    `   - Type: ${c.type} | Messages: ${c.totalMsgCount}`,
  ];
  if (c.purpose) lines.push(`   - Purpose: ${c.purpose}`);
  return lines.join("\n");
}

export async function handleSearchChannels(
  input: SearchChannelsInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const channels = await client.searchChannels(input.teamId, input.term);

    if (channels.length === 0) {
      return {
        content: [{ type: "text", text: `No channels found matching "${input.term}" in team \`${input.teamId}\`.` }],
      };
    }

    const lines = [
      `## Channels matching "${input.term}" (${channels.length})`,
      "",
      ...channels.map(formatChannel),
    ];

    lines.push("", "---", "💡 Use `chatops_get_channel_posts` with a channel ID to read messages, or `chatops_get_pinned_posts` for pinned content.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to search channels: ${msg}`);
  }
}
