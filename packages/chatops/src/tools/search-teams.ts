import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsTeam } from "../types.js";

export interface SearchTeamsInput {
  term: string;
}

function formatTeam(t: ChatOpsTeam, index: number): string {
  const lines = [
    `${index + 1}. **${t.displayName}** (\`${t.name}\`)`,
    `   - ID: \`${t.id}\``,
    `   - Type: ${t.type}`,
  ];
  if (t.description) lines.push(`   - Description: ${t.description}`);
  return lines.join("\n");
}

export async function handleSearchTeams(
  input: SearchTeamsInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const teams = await client.searchTeams(input.term);

    if (teams.length === 0) {
      return {
        content: [{ type: "text", text: `No teams found matching "${input.term}".` }],
      };
    }

    const lines = [
      `## ChatOps Teams matching "${input.term}" (${teams.length})`,
      "",
      ...teams.map(formatTeam),
    ];

    lines.push("", "---", "💡 Use `chatops_list_channels` with a team ID to browse channels, or `chatops_search_posts` to find specific messages.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to search teams: ${msg}`);
  }
}
