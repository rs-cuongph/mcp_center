import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsPost } from "../types.js";
import { resolvePostAuthors, type UserMap } from "../user-resolver.js";

export interface GetThreadInput {
  postId: string;
}

function formatPost(p: ChatOpsPost, users: UserMap): string {
  const author = users.get(p.userId) ?? `\`${p.userId}\``;
  const isReply = p.rootId !== null;
  const prefix = isReply ? "  ↳ Reply" : "📌 Root";
  const lines = [
    `${prefix} — \`${p.id}\` | **${p.createdAt.slice(0, 16)}** | ${author}`,
    `${p.message}`,
  ];
  if (p.files.length) {
    lines.push(`📎 ${p.files.map((f) => `${f.name} (${f.sizeFormatted})`).join(", ")}`);
  }
  return lines.join("\n");
}

export async function handleGetThread(
  input: GetThreadInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const postList = await client.getPostThread(input.postId);

    if (postList.posts.length === 0) {
      return {
        content: [{ type: "text", text: `No posts found in thread \`${input.postId}\`.` }],
      };
    }

    // Batch-resolve userIds → @usernames
    const users = await resolvePostAuthors(client, postList.posts);

    const lines = [
      `## Thread (\`${input.postId}\`) — ${postList.totalCount} message(s)`,
      "",
      ...postList.posts.map((p) => formatPost(p, users)).join("\n---\n").split("\n"),
      "",
      "---",
      "💡 Use `chatops_reply_to_thread` to add a reply to this conversation.",
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to get thread: ${msg}`);
  }
}
