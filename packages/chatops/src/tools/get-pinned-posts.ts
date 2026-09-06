import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsPost } from "../types.js";
import { resolvePostAuthors, type UserMap } from "../user-resolver.js";

export interface GetPinnedPostsInput {
  channelId: string;
}

function formatPost(p: ChatOpsPost, index: number, users: UserMap): string {
  const author = users.get(p.userId) ?? `\`${p.userId}\``;
  const lines = [
    `${index + 1}. 📌 **[${p.createdAt.slice(0, 16)}]** ${author}`,
    `   ${p.message.replace(/\n/g, " ").slice(0, 400)}${p.message.length > 400 ? "…" : ""}`,
    `   ID: \`${p.id}\``,
  ];
  if (p.files.length) {
    lines.push(`   📎 ${p.files.map((f) => f.name).join(", ")}`);
  }
  return lines.join("\n");
}

export async function handleGetPinnedPosts(
  input: GetPinnedPostsInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const postList = await client.getPinnedPosts(input.channelId);

    if (postList.posts.length === 0) {
      return {
        content: [{ type: "text", text: `No pinned posts found in channel \`${input.channelId}\`.` }],
      };
    }

    const users = await resolvePostAuthors(client, postList.posts);

    const lines = [
      `## Pinned Posts in \`${input.channelId}\` (${postList.totalCount})`,
      "",
      ...postList.posts.map((p, i) => formatPost(p, i, users)),
      "",
      "---",
      "💡 Use `chatops_get_thread` with a post ID to see full discussion.",
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get pinned posts: ${msg}`);
  }
}
