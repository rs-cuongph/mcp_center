import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsChannel } from "../types.js";

export interface ListChannelsInput {
  teamId: string;
  page?: number;
  perPage?: number;
}

function formatChannel(c: ChatOpsChannel, index: number): string {
  const icon = c.type === "private" ? "🔒" : c.type === "direct" ? "💬" : "#";
  const lines = [
    `${index + 1}. ${icon} **${c.displayName}** (\`${c.name}\`)`,
    `   - ID: \`${c.id}\``,
    `   - Type: ${c.type} | Messages: ${c.totalMsgCount}`,
  ];
  if (c.purpose) lines.push(`   - Purpose: ${c.purpose}`);
  return lines.join("\n");
}

export async function handleListChannels(
  input: ListChannelsInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const channels = await client.getTeamChannels(
      input.teamId,
      input.page ?? 0,
      input.perPage ?? 60
    );

    if (channels.length === 0) {
      return {
        content: [{ type: "text", text: `No channels found in team \`${input.teamId}\`.` }],
      };
    }

    const lines = [
      `## Channels in team \`${input.teamId}\` (${channels.length})`,
      "",
      ...channels.map(formatChannel),
    ];

    lines.push("", "---", "💡 Use `chatops_get_channel_posts` with a channel ID to read messages, or `chatops_get_channel` for full channel details.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to list channels: ${msg}`);
  }
}
