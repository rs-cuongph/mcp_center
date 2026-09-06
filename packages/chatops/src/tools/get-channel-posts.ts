import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsPost } from "../types.js";
import { resolvePostAuthors, type UserMap } from "../user-resolver.js";

export interface GetChannelPostsInput {
  channelId: string;
  page?: number;
  perPage?: number;
}

function formatPost(p: ChatOpsPost, index: number, users: UserMap): string {
  const author = users.get(p.userId) ?? `\`${p.userId}\``;
  const isReply = p.rootId !== null;
  const prefix = isReply ? "  ↳" : `${index + 1}.`;
  const lines = [
    `${prefix} **[${p.createdAt.slice(0, 16)}]** ${author}`,
    `${isReply ? "   " : "   "}${p.message.replace(/\n/g, " ").slice(0, 200)}${p.message.length > 200 ? "…" : ""}`,
  ];
  if (p.fileIds.length) {
    lines.push(`   📎 ${p.fileIds.length} attachment(s)`);
  }
  lines.push(`   ID: \`${p.id}\``);
  return lines.join("\n");
}

export async function handleGetChannelPosts(
  input: GetChannelPostsInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const postList = await client.getChannelPosts(
      input.channelId,
      input.page ?? 0,
      input.perPage ?? 30
    );

    if (postList.posts.length === 0) {
      return {
        content: [{ type: "text", text: `No posts found in channel \`${input.channelId}\`.` }],
      };
    }

    // Batch-resolve userIds → @usernames
    const users = await resolvePostAuthors(client, postList.posts);

    const lines = [
      `## Posts in channel \`${input.channelId}\` (${postList.totalCount} shown)`,
      "",
      ...postList.posts.map((p, i) => formatPost(p, i, users)),
      "",
      "---",
      "💡 Use `chatops_get_thread` with a post ID to see the full thread.",
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get channel posts: ${msg}`);
  }
}
