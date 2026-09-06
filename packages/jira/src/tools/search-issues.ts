import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { JiraIssueSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const SORT_FIELD_MAP: Record<string, string> = {
  summary: "summary",
  issuetype: "issuetype",
  issuekey: "key",
  created: "created",
  updated: "updated",
  timespent: "timespent",
  originalEstimate: "originalEstimate",
  remainingEstimate: "remainingEstimate",
  priority: "priority",
  dueDate: "due",
  assignee: "assignee",
  status: "status",
  typeOfWork: "cf[10340]",
  defectOwner: "cf[10320]",
  planStartDate: "cf[10313]",
  defectOrigin: "cf[10336]",
  actualStartDate: "cf[10315]",
  severity: "cf[10326]",
  actualEndDate: "cf[10316]",
  percentDone: "cf[10338]",
};

export const searchIssuesSchema = z.object({
  jql: z
    .string()
    .min(1, "jql is required")
    .describe("Jira Query Language string. For time tracking fields (timespent, timeestimate), use Jira's natural duration syntax like '65h' or '3d' instead of calculating seconds."),
  limit: z
    .number()
    .int()
    .min(1, "limit must be at least 1")
    .max(50, "limit cannot exceed 50")
    .default(10),
  startAt: z
    .number()
    .int()
    .min(0, "startAt must be >= 0")
    .default(0)
    .describe("0-based index of the first result to return. Use with limit for pagination. E.g. startAt=50, limit=50 returns results 51-100."),
  orderBy: z
    .enum([
      "summary", "issuetype", "issuekey", "created", "updated",
      "timespent", "originalEstimate", "remainingEstimate", "priority",
      "dueDate", "assignee", "status", "typeOfWork", "defectOwner",
      "planStartDate", "defectOrigin", "actualStartDate", "severity",
      "actualEndDate", "percentDone"
    ] as const)
    .optional()
    .describe("Sort field based on Jira internal sorting syntax."),
  order: z
    .enum(["ASC", "DESC"])
    .default("DESC")
    .describe("Sort order (ASC or DESC)."),
});

export type SearchIssuesInput = z.infer<typeof searchIssuesSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * MCP tool handler for `jira_search_issues`.
 */
export async function handleSearchIssues(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = searchIssuesSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { jql, limit, startAt, orderBy, order } = parsed.data;

  // Build the final JQL by appending ORDER BY if provided
  let finalJql = jql;
  if (orderBy) {
    const mappedField = SORT_FIELD_MAP[orderBy];
    finalJql = `${jql} ORDER BY ${mappedField} ${order}`;
  }

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
    const result = await client.searchIssues(finalJql, limit, startAt);
    return {
      content: [
        {
          type: "text",
          text: formatSearchResult(finalJql, result.total, result.issues, startAt),
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

function formatSearchResult(
  jql: string,
  total: number,
  issues: JiraIssueSummary[],
  startAt: number
): string {
  const from = startAt + 1;
  const to = startAt + issues.length;
  const header = [
    `# Jira Search Results`,
    ``,
    `**JQL:** \`${jql}\``,
    `**Total:** ${total} issue(s) found | Showing: ${from}–${to}`,
    ``,
  ];

  if (issues.length === 0) {
    return [...header, "_No issues matched the query._"].join("\n");
  }

  const rows = issues.map((issue) => {
    const lines = [
      `## ${issue.key}: ${issue.summary}`,
      ``,
      `| Field | Value |`,
      `|-------|-------|`,
      `| **Type** | ${issue.issueType} |`,
      `| **Status** | ${issue.status} |`,
      `| **Priority** | ${issue.priority ?? "—"} |`,
      `| **Assignee** | ${issue.assignee ?? "Unassigned"} |`,
    ];

    if (issue.defectOwner) {
      lines.push(`| **Defect Owner** | ${issue.defectOwner} |`);
    }
    if (issue.severity) {
      lines.push(`| **Severity** | ${issue.severity} |`);
    }
    if (issue.defectOrigin) {
      lines.push(`| **Defect Origin** | ${issue.defectOrigin} |`);
    }

    lines.push(`| **Created** | ${issue.created} |`);
    lines.push(`| **Updated** | ${issue.updated} |`);

    if (issue.dueDate) {
      lines.push(`| **Due** | ${issue.dueDate} |`);
    }
    if (issue.planStartDate) {
      lines.push(`| **Plan Start Date** | ${issue.planStartDate} |`);
    }
    if (issue.actualStartDate) {
      lines.push(`| **Actual Start Date** | ${issue.actualStartDate} |`);
    }
    if (issue.actualEndDate) {
      lines.push(`| **Actual End Date** | ${issue.actualEndDate} |`);
    }
    if (issue.originalEstimate) {
      lines.push(`| **Original Estimate** | ${issue.originalEstimate} |`);
    }
    if (issue.remainingEstimate) {
      lines.push(`| **Remaining Estimate** | ${issue.remainingEstimate} |`);
    }
    if (issue.timeSpent) {
      lines.push(`| **Time Spent** | ${issue.timeSpent} |`);
    }
    if (issue.typeOfWork) {
      lines.push(`| **Type of Work** | ${issue.typeOfWork} |`);
    }
    if (issue.percentDone) {
      lines.push(`| **% Done** | ${issue.percentDone} |`);
    }

    lines.push(``);
    lines.push(`**URL:** ${issue.url}`);

    return lines.join("\n");
  });

  const nextSuggestions: string[] = [
    "`jira_get_issue({issueKey: \"<key>\"})` for full issue details",
  ];
  if (to < total) {
    nextSuggestions.push(`\`jira_search_issues({jql: "${jql}", startAt: ${to}})\` for next page`);
  }

  return [...header, ...rows].join("\n\n") + navigationHint(...nextSuggestions);
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
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
