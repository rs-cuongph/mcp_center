import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { TempoWorklogListItem } from "../types.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const searchWorklogsSchema = z.object({
  dateFrom: z
    .string()
    .regex(DATE_REGEX, "dateFrom must be in yyyy-MM-dd format")
    .describe("Start of date range (yyyy-MM-dd), e.g. 2026-04-20"),
  dateTo: z
    .string()
    .regex(DATE_REGEX, "dateTo must be in yyyy-MM-dd format")
    .describe("End of date range inclusive (yyyy-MM-dd), e.g. 2026-04-26"),
  workers: z
    .array(z.string().min(1))
    .min(1, "At least one worker username is required")
    .describe("List of Jira usernames/keys to fetch worklogs for, e.g. [\"ducnpp@runsystem.net\"]"),
});

export type SearchWorklogsInput = z.infer<typeof searchWorklogsSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleSearchWorklogs(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const parsed = searchWorklogsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { dateFrom, dateTo, workers } = parsed.data;

  let sessionCookies;
  try {
    sessionCookies = await loadAndValidateSession(
      cfg.JIRA_SESSION_FILE,
      cfg.JIRA_BASE_URL,
      cfg.JIRA_VALIDATE_PATH
    );
  } catch (err: unknown) {
    if (isMcpError(err)) return authErrorContent(err.code, err.message);
    throw err;
  }

  try {
    const client = new JiraHttpClient(cfg.JIRA_BASE_URL, sessionCookies);
    const worklogs = await client.searchWorklogs({ dateFrom, dateTo, workers });

    const text = formatWorklogs(dateFrom, dateTo, workers, worklogs);
    return { content: [{ type: "text" as const, text }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmtHours(seconds: number): string {
  return (seconds / 3600).toFixed(2) + "h";
}

function formatWorklogs(
  dateFrom: string,
  dateTo: string,
  workers: string[],
  worklogs: TempoWorklogListItem[]
): string {
  const lines: string[] = [];

  const totalSeconds = worklogs.reduce((sum, wl) => sum + wl.timeSpentSeconds, 0);

  lines.push(`# 📋 Tempo Worklogs`);
  lines.push("");
  lines.push(`**Period:** ${dateFrom} → ${dateTo}`);
  lines.push(`**Workers:** ${workers.join(", ")}`);
  lines.push(`**Total entries:** ${worklogs.length} | **Total time:** ${fmtHours(totalSeconds)}`);
  lines.push("");

  if (worklogs.length === 0) {
    lines.push("_No worklogs found for the specified workers and date range._");
  } else {
    lines.push(`| ID | Date | Issue | Time | Process | Type of Work | Comment |`);
    lines.push(`|---|---|---|---|---|---|---|`);

    for (const wl of worklogs) {
      const issue = wl.issueSummary ? `${wl.issueKey}: ${wl.issueSummary.slice(0, 40)}` : wl.issueKey;
      const comment = wl.comment ? wl.comment.replace(/\n/g, " ").slice(0, 50) + (wl.comment.length > 50 ? "…" : "") : "—";
      lines.push(
        `| ${wl.tempoWorklogId} | ${wl.startDate} | ${issue} | ${wl.timeSpent} | ${wl.process ?? "—"} | ${wl.typeOfWork ?? "—"} | ${comment} |`
      );
    }
  }

  lines.push(
    navigationHint(
      "`jira_add_worklog({issueKey: \"<key>\", timeSpent: \"1h\"})` to log time on an issue",
      "`jira_update_worklog({worklogId: \"<id>\", timeSpent: \"2h\"})` to update a worklog",
      "`jira_get_timesheet_approvals` to check approval status for a team"
    )
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function authErrorContent(code: string, message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `[${code}] ${message}\n\nRun: npm run jira-auth-login` }],
  };
}
