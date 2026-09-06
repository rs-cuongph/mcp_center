import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { isMcpError } from "../errors.js";
import { escapeJqlString, navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { JiraIssue, JiraIssueSummary } from "../types.js";

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]+-\d+$/;

const SORT_FIELD_MAP: Record<"updated" | "created" | "priority" | "issuekey", string> = {
  updated: "updated",
  created: "created",
  priority: "priority",
  issuekey: "key",
};

export const smartSearchToolSchema = {
  query: z
    .string()
    .trim()
    .min(1, "query is required")
    .describe("Issue key, explicit JQL, or natural-language search text."),
  mode: z
    .enum(["auto", "jql", "smart"])
    .optional()
    .default("auto")
    .describe("auto detects issue key/JQL/smart text; jql treats query as JQL; smart builds JQL from filters."),
  project: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9_]+$/, "project must be a Jira project key, e.g. DNIEM")
    .optional(),
  issueType: z.string().trim().min(1).optional().describe("Optional Jira issue type, e.g. Bug, Task, Story."),
  status: z.string().trim().min(1).optional().describe("Optional exact Jira status name."),
  assignee: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Optional assignee. Use "me" for currentUser(), "unassigned" for empty.'),
  text: z.string().trim().min(1).optional().describe("Optional text search term to add with text ~."),
  updatedWithinDays: z.number().int().min(1).max(365).optional(),
  createdWithinDays: z.number().int().min(1).max(365).optional(),
  hasAttachmentType: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Optional attachment extension/type for ScriptRunner hasAttachments(), e.g. "pdf".'),
  includeDone: z.boolean().optional().default(false).describe("When false, open/done intent controls statusCategory."),
  limit: z.number().int().min(1).max(50).optional().default(10),
  startAt: z.number().int().min(0).optional().default(0),
  orderBy: z.enum(["updated", "created", "priority", "issuekey"]).optional().default("updated"),
  order: z.enum(["ASC", "DESC"]).optional().default("DESC"),
};

export const smartSearchSchema = z.object(smartSearchToolSchema);

export type SmartSearchInput = z.infer<typeof smartSearchSchema>;

export type SmartSearchPlan =
  | { type: "issue"; issueKey: string }
  | { type: "jql"; jql: string; reason: string };

interface TextContent {
  type: "text";
  text: string;
}

/**
 * Builds a concrete Jira lookup/search plan from smart-search input.
 */
export function buildSmartSearchPlan(rawInput: z.input<typeof smartSearchSchema>): SmartSearchPlan {
  const input = smartSearchSchema.parse(rawInput);
  const query = input.query.trim();

  if (input.mode !== "jql" && ISSUE_KEY_PATTERN.test(query)) {
    return { type: "issue", issueKey: query };
  }

  if (input.mode === "jql" || (input.mode === "auto" && looksLikeJql(query))) {
    return {
      type: "jql",
      jql: query,
      reason: "Detected explicit JQL syntax.",
    };
  }

  return {
    type: "jql",
    jql: buildJqlFromFilters(input),
    reason: "Built JQL from smart-search filters.",
  };
}

/**
 * MCP tool handler for `jira_smart_search`.
 */
export async function handleSmartSearch(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const parsed = smartSearchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const input = parsed.data;
  const plan = buildSmartSearchPlan(input);

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
    if (plan.type === "issue") {
      const issue = await client.getIssue(plan.issueKey);
      return {
        content: [
          {
            type: "text",
            text: formatIssueResult(issue),
          },
        ],
      };
    }

    const result = await client.searchIssues(plan.jql, input.limit, input.startAt);
    return {
      content: [
        {
          type: "text",
          text: formatSearchResult(plan, result.total, result.issues, input.startAt),
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

function buildJqlFromFilters(input: SmartSearchInput): string {
  const clauses: string[] = [];
  const query = input.query.trim();
  const lowerQuery = query.toLowerCase();
  let usedQueryIntent = false;

  if (input.project) {
    clauses.push(`project = ${input.project}`);
  }

  const issueType = input.issueType ?? detectIssueType(lowerQuery);
  if (issueType) {
    clauses.push(`issuetype = ${quoteJql(issueType)}`);
    usedQueryIntent = true;
  }

  if (input.status) {
    clauses.push(`status = ${quoteJql(input.status)}`);
  } else if (/\b(open|active|unresolved)\b/.test(lowerQuery) && !input.includeDone) {
    clauses.push("statusCategory != Done");
    usedQueryIntent = true;
  } else if (/\b(done|closed|resolved)\b/.test(lowerQuery)) {
    clauses.push("statusCategory = Done");
    usedQueryIntent = true;
  } else if (/\bin progress\b/.test(lowerQuery)) {
    clauses.push('statusCategory = "In Progress"');
    usedQueryIntent = true;
  } else if (/\bto do\b/.test(lowerQuery)) {
    clauses.push('statusCategory = "To Do"');
    usedQueryIntent = true;
  }

  const assignee = input.assignee ?? detectAssignee(lowerQuery);
  if (assignee === "me") {
    clauses.push("assignee = currentUser()");
    usedQueryIntent = true;
  } else if (assignee === "unassigned") {
    clauses.push("assignee is EMPTY");
    usedQueryIntent = true;
  } else if (assignee) {
    clauses.push(`assignee = ${quoteJql(assignee)}`);
  }

  const updatedWithinDays = input.updatedWithinDays ?? detectRelativeDays(lowerQuery, "updated");
  if (updatedWithinDays) {
    clauses.push(`updated >= -${updatedWithinDays}d`);
    usedQueryIntent = true;
  }

  const createdWithinDays = input.createdWithinDays ?? detectRelativeDays(lowerQuery, "created");
  if (createdWithinDays) {
    clauses.push(`created >= -${createdWithinDays}d`);
    usedQueryIntent = true;
  }

  const attachmentType = input.hasAttachmentType ?? detectAttachmentType(lowerQuery);
  if (attachmentType) {
    clauses.push(`issueFunction in hasAttachments("${escapeJqlString(attachmentType)}")`);
    usedQueryIntent = true;
  }

  if (input.text) {
    clauses.push(`text ~ ${quoteJql(input.text)}`);
  } else if (!usedQueryIntent) {
    clauses.push(`text ~ ${quoteJql(query)}`);
  }

  return appendOrderBy(clauses.join(" AND "), input);
}

function looksLikeJql(query: string): boolean {
  return /\b(project|issue|key|status|statusCategory|assignee|issuetype|type|text|summary|priority|updated|created)\s*(?:=|!=|~|>=|<=|>|<|\bin\b|\bnot\s+in\b)/i.test(query)
    || /\bissueFunction\s+(in|not in)\b/i.test(query)
    || /\bORDER\s+BY\b/i.test(query);
}

function detectIssueType(lowerQuery: string): string | null {
  if (/\bbugs?\b/.test(lowerQuery)) return "Bug";
  if (/\btasks?\b/.test(lowerQuery)) return "Task";
  if (/\bstor(y|ies)\b/.test(lowerQuery)) return "Story";
  if (/\bepics?\b/.test(lowerQuery)) return "Epic";
  if (/\bsub-?tasks?\b/.test(lowerQuery)) return "Sub-task";
  return null;
}

function detectAssignee(lowerQuery: string): string | null {
  if (/\b(assigned to me|my issues|mine)\b/.test(lowerQuery)) return "me";
  if (/\bunassigned\b/.test(lowerQuery)) return "unassigned";
  return null;
}

function detectRelativeDays(lowerQuery: string, field: "updated" | "created"): number | null {
  const pattern = new RegExp(`\\b${field}\\s+(?:in\\s+)?(?:last|past)\\s+(\\d+)\\s+days?\\b`);
  const match = lowerQuery.match(pattern);
  if (!match) return null;

  const days = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(days) || days < 1 || days > 365) return null;
  return days;
}

function detectAttachmentType(lowerQuery: string): string | null {
  const match = lowerQuery.match(/\b(?:has|with)\s+([a-z0-9]+)\s+attachments?\b/);
  return match?.[1] ?? null;
}

function appendOrderBy(jql: string, input: SmartSearchInput): string {
  if (/\bORDER\s+BY\b/i.test(jql)) {
    return jql;
  }

  return `${jql} ORDER BY ${SORT_FIELD_MAP[input.orderBy]} ${input.order}`;
}

function quoteJql(value: string): string {
  if (/^[A-Z][A-Z0-9_]+$/i.test(value) && !/\s/.test(value)) {
    return value;
  }

  return `"${escapeJqlString(value)}"`;
}

function formatSearchResult(
  plan: Extract<SmartSearchPlan, { type: "jql" }>,
  total: number,
  issues: JiraIssueSummary[],
  startAt: number
): string {
  const from = startAt + 1;
  const to = startAt + issues.length;
  const header = [
    "# Jira Smart Search Results",
    "",
    `**Mode:** Search`,
    `**Reason:** ${plan.reason}`,
    `**JQL:** \`${plan.jql}\``,
    `**Total:** ${total} issue(s) found | Showing: ${from}-${to}`,
    "",
  ];

  if (issues.length === 0) {
    return [...header, "_No issues matched the query._"].join("\n");
  }

  const rows = issues.map((issue) => {
    const lines = [
      `## ${issue.key}: ${issue.summary}`,
      "",
      `| Field | Value |`,
      `|-------|-------|`,
      `| **Type** | ${issue.issueType} |`,
      `| **Status** | ${issue.status} |`,
      `| **Priority** | ${issue.priority ?? "—"} |`,
      `| **Assignee** | ${issue.assignee ?? "Unassigned"} |`,
    ];

    if (issue.severity) {
      lines.push(`| **Severity** | ${issue.severity} |`);
    }

    lines.push(`| **Created** | ${issue.created} |`);
    lines.push(`| **Updated** | ${issue.updated} |`);
    lines.push("");
    lines.push(`**URL:** ${issue.url}`);

    return lines.join("\n");
  });

  const suggestions = [`\`jira_get_issue({issueKey: "<key>"})\` for full issue details`];
  if (to < total) {
    suggestions.push(`\`jira_smart_search({query: "${escapeJqlString(plan.jql)}", mode: "jql", startAt: ${to}})\` for next page`);
  }

  return [...header, ...rows].join("\n\n") + navigationHint(...suggestions);
}

function formatIssueResult(issue: JiraIssue): string {
  const lines = [
    "# Jira Smart Search Results",
    "",
    "**Mode:** Issue key lookup",
    "",
    `## ${issue.key}: ${issue.summary}`,
    "",
    `**URL:** ${issue.url}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Type** | ${issue.issueType} |`,
    `| **Status** | ${issue.status} |`,
    `| **Priority** | ${issue.priority ?? "—"} |`,
    `| **Assignee** | ${issue.assignee ?? "Unassigned"} |`,
    `| **Reporter** | ${issue.reporter ?? "—"} |`,
    `| **Created** | ${issue.created} |`,
    `| **Updated** | ${issue.updated} |`,
  ];

  if (issue.description) {
    lines.push("");
    lines.push("## Description");
    lines.push("");
    lines.push(issue.description);
  }

  return lines.join("\n") + navigationHint(`\`jira_get_issue({issueKey: "${issue.key}"})\` for attachment-aware full details`);
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
