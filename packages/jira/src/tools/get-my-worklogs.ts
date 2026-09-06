import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { todayLocalDate, navigationHint } from "../utils.js";
import type { Config } from "../config.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getMyWorklogsSchema = z.object({
  dateFrom: z.string().regex(DATE_REGEX, "dateFrom must be in yyyy-MM-dd format").optional(),
  dateTo: z.string().regex(DATE_REGEX, "dateTo must be in yyyy-MM-dd format").optional(),
});

export async function handleGetMyWorklogs(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getMyWorklogsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const today = todayLocalDate();
  const dateFrom = parsed.data.dateFrom ?? today;
  const dateTo = parsed.data.dateTo ?? today;

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
    const currentUser = await client.getCurrentUser();
    const worklogs = await client.getMyWorklogs({
      workerKey: currentUser.key,
      dateFrom,
      dateTo,
    });

    const lines = [
      `# My Tempo Worklogs`,
      "",
      `**Worker:** ${currentUser.displayName}`,
      `**Date From:** ${dateFrom}`,
      `**Date To:** ${dateTo}`,
      "",
    ];
    if (worklogs.length === 0) {
      lines.push("_No worklogs found._");
    } else {
      lines.push(`| Tempo ID | Issue | Date | Time Spent | Process | Type Of Work | Comment |`);
      lines.push(`|---|---|---|---|---|---|---|`);
      for (const wl of worklogs) {
        const issue = wl.issueSummary
          ? `${wl.issueKey}: ${wl.issueSummary}`
          : wl.issueKey;
        lines.push(
          `| ${wl.tempoWorklogId} | ${issue} | ${wl.startDate} | ${wl.timeSpent} | ${wl.process ?? "—"} | ${wl.typeOfWork ?? "—"} | ${wl.comment ?? "—"} |`
        );
      }
    }

    const hint = navigationHint(
      `\`jira_add_worklog({issueKey: "<key>", timeSpent: "1h"})\` to log time`,
      `\`jira_update_worklog({worklogId: "<id>", timeSpent: "2h"})\` to update a worklog`,
      `\`jira_delete_worklog({worklogId: "<id>"})\` to delete a worklog`,
    );
    return { content: [{ type: "text", text: lines.join("\n") + hint }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function authErrorContent(code: string, message: string) {
  return { isError: true as const, content: [{ type: "text" as const, text: `[${code}] ${message}` }] };
}
