import { McpError } from "@cuongph.dev/mcp-core";

export { McpError, isMcpError, configError, invalidInput } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Internal error taxonomy for the Jira MCP server
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "PERMISSION_DENIED"
  | "JIRA_HTTP_ERROR"
  | "JIRA_RESPONSE_ERROR"
  | "CONFIG_ERROR"
  | "INVALID_INPUT";

// ---------------------------------------------------------------------------
// Factory helpers — keeps call sites concise
// ---------------------------------------------------------------------------

export function authRequired(message = "Set JIRA_EMAIL and JIRA_PASSWORD in .env (or MCP env)."): McpError {
  return new McpError("AUTH_REQUIRED", message);
}

export function sessionExpired(message = "Jira authentication failed. Set JIRA_EMAIL and JIRA_PASSWORD in .env (or MCP env)."): McpError {
  return new McpError("SESSION_EXPIRED", message);
}

/**
 * Jira returned 403 — the authenticated user lacks permission for this resource.
 * Re-logging in will NOT fix this; the Jira admin needs to grant access.
 */
export function permissionDenied(resource?: string): McpError {
  const what = resource ? ` to access ${resource}` : "";
  return new McpError(
    "PERMISSION_DENIED",
    `Your Jira account does not have permission${what}. Contact your Jira administrator to request access.`
  );
}

export function jiraHttpError(status: number, url: string, body?: string): McpError {
  return new McpError(
    "JIRA_HTTP_ERROR",
    `Jira HTTP ${status} from ${url}`,
    { status, url, body }
  );
}

export function jiraResponseError(message: string, raw?: unknown): McpError {
  return new McpError("JIRA_RESPONSE_ERROR", message, raw);
}
