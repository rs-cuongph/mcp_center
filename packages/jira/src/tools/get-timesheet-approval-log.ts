import { z } from "zod";
import { JiraHttpClient } from "../jira/http-client.js";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { TempoApprovalLogEntry } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getTimesheetApprovalLogSchema = z
  .object({
    teamId: z.number().int().positive().optional().describe("Numeric Tempo team ID (e.g., 115). Use this OR teamName."),
    teamName: z.string().optional().describe("Team name to auto-resolve (e.g., \"GensaiPlatform\"). Use this OR teamId."),
    periodStartDate: z
      .string()
      .regex(DATE_REGEX, "periodStartDate must be in yyyy-MM-dd format")
      .describe("Start date of the timesheet period (e.g., 2026-04-20)"),
  })
  .refine((d) => d.teamId !== undefined || (d.teamName !== undefined && d.teamName.length > 0), {
    message: "Provide either teamId (number) or teamName (string)",
  });

export type GetTimesheetApprovalLogInput = z.infer<typeof getTimesheetApprovalLogSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetTimesheetApprovalLog(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const parsed = getTimesheetApprovalLogSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { teamId: rawTeamId, teamName, periodStartDate } = parsed.data;

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

    if (rawTeamId !== undefined) {
      teamId = rawTeamId;
    } else {
      const teams = await client.searchTempoTeams(teamName!);
      if (teams.length === 0) {
        return errorContent(`No Tempo team found matching "${teamName}". Use \`jira_search_tempo_teams\` to find the correct name.`);
      }
      const match = teams.find((t) => t.name.toLowerCase() === teamName!.toLowerCase()) ?? teams[0];
      teamId = match.id;
    }

    const logByUser = await client.getTimesheetApprovalLog(teamId, periodStartDate);

    // Filter out users with no log entries
    const activeEntries: Array<{ userKey: string; entries: TempoApprovalLogEntry[] }> = [];
    for (const [userKey, entries] of logByUser.entries()) {
      if (entries.length > 0) {
        activeEntries.push({ userKey, entries });
      }
    }

    const totalUsers = logByUser.size;
    const usersWithActivity = activeEntries.length;

    if (totalUsers === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No approval log records found for team ${teamId} starting ${periodStartDate}.`,
          },
        ],
      };
    }

    const text = formatApprovalLog(teamId, periodStartDate, activeEntries, totalUsers, usersWithActivity);
    return { content: [{ type: "text" as const, text }] };
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

const ACTION_LABEL: Record<string, string> = {
  submit: "📤 Submitted",
  approve: "✅ Approved",
  reject: "❌ Rejected",
  reopen: "🔄 Reopened",
};

function formatActionName(name: string): string {
  return ACTION_LABEL[name] ?? name;
}

function fmtHours(seconds: number): string {
  return (seconds / 3600).toFixed(1) + "h";
}

function formatApprovalLog(
  teamId: number,
  periodStartDate: string,
  activeEntries: Array<{ userKey: string; entries: TempoApprovalLogEntry[] }>,
  totalUsers: number,
  usersWithActivity: number
): string {
  const lines: string[] = [];

  lines.push(`📋 **Timesheet Approval Log**`);
  lines.push(`**Team ID:** ${teamId} | **Period Start:** ${periodStartDate}`);
  lines.push(`**Members in team:** ${totalUsers} | **Members with activity:** ${usersWithActivity}`);
  lines.push("");

  if (activeEntries.length === 0) {
    lines.push("_No approval actions recorded yet for this period._");
  } else {
    for (const { entries } of activeEntries) {
      const latest = entries[entries.length - 1];
      lines.push(`### ${latest.displayName} (\`${latest.userKey}\`)`);
      lines.push(
        `**Period:** ${latest.periodDateFrom} → ${latest.periodDateTo} | **Submitted:** ${fmtHours(latest.submittedSeconds)} / ${fmtHours(latest.requiredSeconds)}`
      );
      lines.push("");

      // Timeline of actions
      lines.push("| Action | By | Reviewer | Comment | Time |");
      lines.push("|--------|-----|----------|---------|------|");

      for (const entry of entries) {
        const action = formatActionName(entry.actionName);
        const by = entry.actorDisplayName;
        const reviewer = entry.reviewerDisplayName;
        const comment = entry.actionComment.replace(/\n/g, " ").slice(0, 60) + (entry.actionComment.length > 60 ? "…" : "");
        const created = entry.actionCreated.replace("T", " ").slice(0, 16);
        lines.push(`| ${action} | ${by} | ${reviewer} | ${comment} | ${created} |`);
      }

      lines.push("");
    }
  }

  lines.push(
    navigationHint(
      "To view current approval statuses (not history), use `jira_get_timesheet_approvals`. To search for team IDs, use `jira_search_tempo_teams`."
    )
  );

  return lines.join("\n");
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
