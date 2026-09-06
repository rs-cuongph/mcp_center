// ---------------------------------------------------------------------------
// chatops_smart_search — composite tool that resolves names → IDs internally.
//
// Accepts human-readable params (team name, channel name, user email/name)
// and automatically resolves them before running the search.
// This turns 4 sequential LLM tool calls into 1.
// ---------------------------------------------------------------------------
import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsPost } from "../types.js";
import { resolvePostAuthors, type UserMap } from "../user-resolver.js";

export interface SmartSearchInput {
  teamName: string;
  channelName?: string;
  userName?: string;
  dateFrom?: string;
  dateTo?: string;
  keywords?: string;
  page?: number;
  perPage?: number;
}

function formatPost(p: ChatOpsPost, index: number, users: UserMap): string {
  const author = users.get(p.userId) ?? `\`${p.userId}\``;
  const lines = [
    `${index + 1}. **Post** \`${p.id}\``,
    `   - Author  : ${author}`,
    `   - Created : ${p.createdAt}`,
    `   - Message : ${p.message.slice(0, 500)}${p.message.length > 500 ? "…" : ""}`,
  ];
  if (p.fileIds.length > 0) lines.push(`   - Files   : ${p.fileIds.join(", ")}`);
  return lines.join("\n");
}

export async function handleSmartSearch(
  input: SmartSearchInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    // ── Step 1: Resolve team name → team ID ──────────────────────────────
    // Use getTeams (GET) instead of searchTeams (POST) to avoid CSRF issues
    const allTeams = await client.getTeams();
    const teamLower = input.teamName.toLowerCase();
    const team = allTeams.find(
      (t) =>
        t.displayName.toLowerCase().includes(teamLower) ||
        t.name.toLowerCase().includes(teamLower)
    );
    if (!team) {
      const available = allTeams.map((t) => `"${t.displayName}"`).join(", ");
      return errorContent(`Team "${input.teamName}" not found. Available: ${available}`);
    }

    // ── Step 2: Resolve user & channel in parallel ───────────────────────
    let username: string | undefined;
    let channelSlug: string | undefined;

    const resolvers: Promise<void>[] = [];

    if (input.userName) {
      resolvers.push(
        client.searchUsers(input.userName, { perPage: 1 }).then((users) => {
          if (users.length > 0) {
            username = users[0].username;
          }
        })
      );
    }

    if (input.channelName) {
      // Use getTeamChannels (GET) + filter instead of searchChannels (POST)
      const channelLower = input.channelName.toLowerCase();
      resolvers.push(
        client.getTeamChannels(team.id, 0, 200).then((channels) => {
          const match = channels.find(
            (c) =>
              c.displayName.toLowerCase().includes(channelLower) ||
              c.name.toLowerCase().includes(channelLower)
          );
          if (match) channelSlug = match.name;
        })
      );
    }

    await Promise.all(resolvers);

    // Validate resolutions
    if (input.userName && !username) {
      return errorContent(`User "${input.userName}" not found.`);
    }
    if (input.channelName && !channelSlug) {
      return errorContent(`Channel "${input.channelName}" not found in team "${team.displayName}".`);
    }

    // ── Step 3: Build search terms ───────────────────────────────────────
    const termParts: string[] = [];
    if (channelSlug) termParts.push(`in:${channelSlug}`);
    if (username) termParts.push(`from:${username}`);
    if (input.dateFrom) termParts.push(`after:${input.dateFrom}`);
    if (input.dateTo) termParts.push(`before:${input.dateTo}`);
    if (input.keywords) termParts.push(input.keywords);

    const terms = termParts.join(" ");
    if (!terms.trim()) {
      return errorContent("No search criteria provided. Specify at least one of: channelName, userName, dateFrom/dateTo, or keywords.");
    }

    // ── Step 4: Execute search ───────────────────────────────────────────
    const result = await client.searchPosts(team.id, terms, {
      page: input.page ?? 0,
      perPage: input.perPage ?? 20,
    });

    if (result.posts.length === 0) {
      return {
        content: [{ type: "text", text: `No posts found.\n\n**Team:** ${team.displayName}\n**Query:** \`${terms}\`` }],
      };
    }

    const users = await resolvePostAuthors(client, result.posts);

    const header = [
      `## Smart Search Results (${result.total} posts)`,
      "",
      `**Team:** ${team.displayName} | **Query:** \`${terms}\``,
      "",
    ];

    const lines = [
      ...header,
      ...result.posts.map((p, i) => formatPost(p, i, users)),
      "",
      "---",
      "💡 Use `chatops_get_thread` with a post ID to see replies.",
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Smart search failed: ${msg}`);
  }
}
