import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsTeam } from "../types.js";

export interface ListTeamsInput {
  // No pagination — /api/v4/users/me/teams returns all teams at once
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

export async function handleListTeams(
  _input: ListTeamsInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    const teams = await client.getTeams();

    if (teams.length === 0) {
      return {
        content: [{ type: "text", text: "No teams found. You may not be a member of any team yet." }],
      };
    }

    const lines = [
      `## ChatOps Teams (${teams.length})`,
      "",
      ...teams.map(formatTeam),
    ];

    lines.push("", "---", "💡 Use `chatops_list_channels` with a team ID to browse channels, or `chatops_get_team` for full team details.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to list teams: ${msg}`);
  }
}
