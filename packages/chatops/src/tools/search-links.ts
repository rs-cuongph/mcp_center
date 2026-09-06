import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsPost } from "../types.js";
import { resolvePostAuthors, type UserMap } from "../user-resolver.js";

export interface SearchLinksInput {
  teamId: string;
  /** Optional extra keyword to narrow results (e.g. a domain name like "github.com") */
  term?: string;
  /** Optional channel name (slug) to restrict search to a specific channel */
  channelName?: string;
  page?: number;
  perPage?: number;
}

/** Extracts all URLs from a post message */
function extractUrls(message: string): string[] {
  const urlRegex = /https?:\/\/[^\s\]>)'"]+/g;
  return [...new Set(message.match(urlRegex) ?? [])];
}

function formatPostWithLinks(p: ChatOpsPost, index: number, users: UserMap): string {
  const author = users.get(p.userId) ?? `\`${p.userId}\``;
  const urls = extractUrls(p.message);
  const lines = [
    `${index + 1}. **Post** \`${p.id}\` — ${p.createdAt}`,
    `   - Channel : \`${p.channelId}\``,
    `   - Author  : ${author}`,
    ...urls.map((u) => `   - 🔗 ${u}`),
  ];
  return lines.join("\n");
}

export async function handleSearchLinks(
  input: SearchLinksInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    // Compose search terms: always include "http", optionally narrow by channel and keyword
    const parts = ["http"];
    if (input.channelName) parts.unshift(`in:${input.channelName}`);
    if (input.term) parts.push(input.term);
    const terms = parts.join(" ");

    const result = await client.searchPosts(input.teamId, terms, {
      isOrSearch: false,
      page: input.page ?? 0,
      perPage: input.perPage ?? 20,
    });

    // Filter to only posts that actually contain links
    const postsWithLinks = result.posts.filter((p) => extractUrls(p.message).length > 0);

    if (postsWithLinks.length === 0) {
      return {
        content: [{ type: "text", text: "No posts with links found." }],
      };
    }

    const users = await resolvePostAuthors(client, postsWithLinks);

    const lines = [
      `## Posts with Links (${postsWithLinks.length} found)`,
      "",
      ...postsWithLinks.map((p, i) => formatPostWithLinks(p, i, users)),
      "",
      "---",
      "💡 Use `chatops_get_post` with a post ID to see the full message context.",
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to search links: ${msg}`);
  }
}
