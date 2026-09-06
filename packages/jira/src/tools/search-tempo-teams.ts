import { z } from "zod";
import { JiraHttpClient } from "../jira/http-client.js";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";

export const searchTempoTeamsSchema = z.object({
  query: z.string().describe("Search string to find teams by name or lead (can be empty string to fetch all)"),
});

export type SearchTempoTeamsInput = z.infer<typeof searchTempoTeamsSchema>;

export async function handleSearchTempoTeams(input: SearchTempoTeamsInput, config: Config) {
  try {
    const session = await loadAndValidateSession(
      config.JIRA_SESSION_FILE,
      config.JIRA_BASE_URL,
      config.JIRA_VALIDATE_PATH
    );

    const client = new JiraHttpClient(config.JIRA_BASE_URL, session);
    const teams = await client.searchTempoTeams(input.query);

    if (teams.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No Tempo teams found matching the query." }],
      };
    }

    let markdown = `Found ${teams.length} Tempo team(s):\n\n`;
    markdown += `| ID | Name | Lead | Public |\n`;
    markdown += `|---|---|---|---|\n`;

    for (const team of teams) {
      const publicFlag = team.isPublic ? "✅" : "❌";
      markdown += `| ${team.id} | ${team.name} | ${team.leadDisplayName} (${team.leadUsername}) | ${publicFlag} |\n`;
    }

    markdown += navigationHint(
      "Once you have the team ID, you can fetch its timesheet approvals using `jira_get_timesheet_approvals`."
    );

    return {
      content: [{ type: "text" as const, text: markdown }],
    };
  } catch (error: unknown) {
    if (isMcpError(error)) {
      return {
        content: [{ type: "text" as const, text: `Jira API Error: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: `Unexpected Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
