import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const ACTION_VALUES = ["approve", "reject", "reopen"] as const;
type ApprovalAction = (typeof ACTION_VALUES)[number];

export const actOnTimesheetApprovalSchema = z.object({
  userKey: z
    .string()
    .min(1)
    .describe("Jira user key of the team member whose timesheet to act on (e.g., \"lapdq@runsystem.net\")"),
  periodDateFrom: z
    .string()
    .regex(DATE_REGEX, "periodDateFrom must be in yyyy-MM-dd format")
    .describe("Start date of the timesheet period (e.g., \"2026-04-20\")"),
  action: z
    .enum(ACTION_VALUES)
    .describe("Action to perform: \"approve\", \"reject\", or \"reopen\""),
  comment: z
    .string()
    .default("")
    .describe("Optional comment to accompany the action (e.g., reason for rejection)"),
});

export type ActOnTimesheetApprovalInput = z.infer<typeof actOnTimesheetApprovalSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const ACTION_EMOJI: Record<ApprovalAction, string> = {
  approve: "✅",
  reject: "❌",
  reopen: "🔄",
};

export async function handleActOnTimesheetApproval(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const parsed = actOnTimesheetApprovalSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { userKey, periodDateFrom, action, comment } = parsed.data;

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

    // Auto-resolve reviewer key from current authenticated user
    const currentUser = await client.getCurrentUser();
    const reviewerKey = currentUser.key;

    await client.actOnTimesheetApproval({
      userKey,
      periodDateFrom,
      action,
      comment,
      reviewerKey,
    });

    const emoji = ACTION_EMOJI[action];
    const lines = [
      `${emoji} **Timesheet ${capitalize(action)}d**`,
      "",
      `| Field | Value |`,
      `|---|---|`,
      `| User | \`${userKey}\` |`,
      `| Period Start | ${periodDateFrom} |`,
      `| Action | ${action} |`,
      `| Reviewer | ${currentUser.displayName} (\`${reviewerKey}\`) |`,
      `| Comment | ${comment || "_(none)_"} |`,
      "",
      navigationHint(
        `Run \`jira_get_timesheet_approvals\` to see updated approval statuses for the team`,
        `Run \`jira_get_timesheet_approval_log\` to view the full action history`
      ),
    ];

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function authErrorContent(code: string, message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `[${code}] ${message}\n\nRun: npm run jira-auth-login` }],
  };
}
