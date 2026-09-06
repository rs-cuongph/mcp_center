import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsUser } from "../types.js";

export interface SearchUsersInput {
  term: string;
  page?: number;
  perPage?: number;
}

function formatUser(u: ChatOpsUser, index: number): string {
  const parts = [`${index + 1}. **@${u.username}** — ${u.displayName}`];
  if (u.position) parts[0] += ` (${u.position})`;
  parts.push(`   ID: \`${u.id}\``);
  return parts.join("\n");
}

export async function handleSearchUsers(
  input: SearchUsersInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const users = await client.searchUsers(input.term, {
      page: input.page ?? 0,
      perPage: input.perPage ?? 20,
    });

    if (users.length === 0) {
      return {
        content: [{ type: "text", text: `No users found matching "${input.term}".` }],
      };
    }

    const lines = [
      `## User Search: "${input.term}" (${users.length} results)`,
      "",
      ...users.map(formatUser),
    ];

    lines.push("", "---", "💡 Use `chatops_get_user` for full details, or `chatops_search_posts` with `from:username` to find their messages.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to search users: ${msg}`);
  }
}
