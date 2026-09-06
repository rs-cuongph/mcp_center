import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";

export interface AddReactionInput {
  postId: string;
  emojiName: string;
}

export async function handleAddReaction(
  input: AddReactionInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    // Resolve the authenticated user's ID first
    const userId = await client.getCurrentUserId();
    const reaction = await client.addReaction(userId, input.postId, input.emojiName);

    const lines = [
      "## ✅ Reaction added",
      "",
      `- **Emoji**: :${reaction.emojiName}:`,
      `- **Post ID**: \`${reaction.postId}\``,
      `- **User ID**: \`${reaction.userId}\``,
      `- **Reacted at**: ${reaction.createdAt}`,
      "",
      "---",
      "💡 Use `chatops_get_reactions` to see all reactions on this post, or `chatops_get_thread` to view the full conversation.",
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to add reaction: ${msg}`);
  }
}
