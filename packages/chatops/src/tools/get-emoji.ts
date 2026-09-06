import type { Config } from "../config.js";
import type { ChatOpsEmoji } from "../types.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";

export interface GetEmojiInput {
  emojiId?: string;
  emojiName?: string;
}

function formatEmoji(emoji: ChatOpsEmoji): string {
  return [
    `- **Name**: :${emoji.name}: (\`${emoji.name}\`)`,
    `- **ID**: \`${emoji.id}\``,
    `- **Creator ID**: \`${emoji.creatorId}\``,
    `- **Created at**: ${emoji.createdAt}`,
    `- **Updated at**: ${emoji.updatedAt}`,
  ].join("\n");
}

export async function handleGetEmoji(
  input: GetEmojiInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    // ── Lookup by ID ──────────────────────────────────────────────────────
    if (input.emojiId) {
      const emoji = await client.getEmoji(input.emojiId);
      const lines = [
        `## Emoji: :${emoji.name}:`,
        "",
        formatEmoji(emoji),
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    // ── Lookup by name ────────────────────────────────────────────────────
    if (input.emojiName) {
      const emoji = await client.getEmojiByName(input.emojiName);
      const lines = [
        `## Emoji: :${emoji.name}:`,
        "",
        formatEmoji(emoji),
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    // ── List all custom emoji ─────────────────────────────────────────────
    const emojis = await client.listEmoji();
    if (emojis.length === 0) {
      return {
        content: [{ type: "text", text: "## Custom Emoji\n\nNo custom emoji found." }],
      };
    }

    const rows = emojis.map(
      (e: ChatOpsEmoji) => `| :${e.name}: | \`${e.name}\` | \`${e.id}\` |`
    );
    const lines = [
      `## Custom Emoji (${emojis.length})`,
      "",
      "| Preview | Name (slug) | ID |",
      "|---------|------------|-----|",
      ...rows,
      "",
      "---",
      "💡 Use emoji names with `chatops_add_reaction` (e.g. emojiName: \"wave\"), or include :emojiname: syntax in `chatops_send_message`.",
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get emoji: ${msg}`);
  }
}
