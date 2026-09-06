import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { TempoTimesheetApproval } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getTimesheetApprovalsSchema = z
  .object({
    teamId: z.number().int().positive().optional().describe("Numeric Tempo team ID (e.g., 484). Use this OR teamName."),
    teamName: z.string().optional().describe("Team name to auto-resolve (e.g., \"GensaiPlatform\"). Use this OR teamId."),
    periodStartDate: z
      .string()
      .regex(DATE_REGEX, "periodStartDate must be in yyyy-MM-dd format")
      .describe("Start date of the timesheet period in yyyy-MM-dd format (e.g., 2026-04-27)"),
  })
  .refine((d) => d.teamId !== undefined || (d.teamName !== undefined && d.teamName.length > 0), {
    message: "Provide either teamId (number) or teamName (string)",
  });

export type GetTimesheetApprovalsInput = z.infer<typeof getTimesheetApprovalsSchema>;

// ---------------------------------------------------------------------------
// MCP content type
// ---------------------------------------------------------------------------

interface TextContent {
  type: "text";
  text: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetTimesheetApprovals(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const parsed = getTimesheetApprovalsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { teamId: rawTeamId, teamName, periodStartDate } = parsed.data;

  // --- Load session ---
  let sessionCookies;
  try {
    sessionCookies = await loadAndValidateSession(
      cfg.JIRA_SESSION_FILE,
      cfg.JIRA_BASE_URL,
      cfg.JIRA_VALIDATE_PATH
    );
  } catch (err: unknown) {
    if (isMcpError(err)) {
      return authErrorContent(err.code, err.message);
    }
    throw err;
  }

  const client = new JiraHttpClient(cfg.JIRA_BASE_URL, sessionCookies);

  try {
    // --- Resolve teamId from teamName if needed ---
    let teamId: number;
    let resolvedTeamLabel: string;

    if (rawTeamId !== undefined) {
      teamId = rawTeamId;
      resolvedTeamLabel = `ID ${teamId}`;
    } else {
      const teams = await client.searchTempoTeams(teamName!);
      if (teams.length === 0) {
        return errorContent(`No Tempo team found matching "${teamName}". Use \`jira_search_tempo_teams\` to find the correct name.`);
      }
      const match = teams.find((t) => t.name.toLowerCase() === teamName!.toLowerCase()) ?? teams[0];
      teamId = match.id;
      resolvedTeamLabel = `"${match.name}" (ID ${teamId})`;
    }

    // --- Fetch Approvals ---
    const approvals = await client.getTimesheetApprovals(teamId, periodStartDate);

    if (approvals.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No timesheet approval records found for team ${resolvedTeamLabel} starting ${periodStartDate}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: formatApprovalsResult(teamId, resolvedTeamLabel, periodStartDate, approvals),
        },
      ],
    };
  } catch (err: unknown) {
    if (isMcpError(err)) {
      return errorContent(`[${err.code}] ${err.message}`);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatApprovalsResult(
  teamId: number,
  teamLabel: string,
  periodStartDate: string,
  approvals: TempoTimesheetApproval[]
): string {
  const lines: string[] = [];
  
  lines.push(`🕒 **Timesheet Approvals**`);
  lines.push(`**Team:** ${teamLabel}`);
  lines.push(`**Period Start:** ${periodStartDate}`);
  lines.push(`**Total Members:** ${approvals.length}`);
  lines.push("");

  lines.push(`| User | Display Name | Status | Logged Hours | Required Hours |`);
  lines.push(`|------|--------------|--------|--------------|----------------|`);

  for (const a of approvals) {
    const loggedHours = (a.workedSeconds / 3600).toFixed(2);
    const requiredHours = (a.requiredSecondsRelativeToday / 3600).toFixed(2);
    const statusIcon = a.status === "open" ? "🟢" : a.status === "approved" ? "✅" : "🔘";
    
    lines.push(
      `| ${a.username} | ${a.displayName} | ${statusIcon} ${a.status} | ${loggedHours}h | ${requiredHours}h |`
    );
  }

  return lines.join("\n") + navigationHint(
    "Use `jira_get_timesheet_approval_log` to see who submitted/approved and when",
    "Use `jira_search_worklogs` to drill into actual logged hours for specific members",
    "Use `jira_act_on_timesheet_approval` to approve or reject a member's timesheet"
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function authErrorContent(code: string, message: string) {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: `[${code}] ${message}\n\nRun: npm run jira-auth-login`,
      },
    ],
  };
}
