import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";

export interface GetReactionsInput {
  postId: string;
}

export async function handleGetReactions(
  input: GetReactionsInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const reactions = await client.getPostReactions(input.postId);

    if (reactions.length === 0) {
      return {
        content: [{ type: "text", text: `## Reactions on post \`${input.postId}\`\n\nNo reactions yet.` }],
      };
    }

    // Group by emoji for a summary view
    const grouped = new Map<string, string[]>();
    for (const r of reactions) {
      if (!grouped.has(r.emojiName)) grouped.set(r.emojiName, []);
      grouped.get(r.emojiName)!.push(r.userId);
    }

    const summaryLines = Array.from(grouped.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([emoji, users]) => `- :${emoji}: **${users.length}** (${users.join(", ")})`);

    const detailLines = reactions.map(
      (r) => `| :${r.emojiName}: | \`${r.userId}\` | ${r.createdAt} |`
    );

    const lines = [
      `## Reactions on post \`${input.postId}\``,
      "",
      `**Total**: ${reactions.length} reaction(s) across ${grouped.size} emoji(s)`,
      "",
      "### Summary",
      ...summaryLines,
      "",
      "### Detail",
      "| Emoji | User ID | Reacted at |",
      "|-------|---------|------------|",
      ...detailLines,
      "",
      "---",
      "💡 Use `chatops_add_reaction` to add a reaction, or `chatops_get_post` to see the full post context.",
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get reactions: ${msg}`);
  }
}
