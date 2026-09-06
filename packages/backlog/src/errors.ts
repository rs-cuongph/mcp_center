import { McpError } from "@cuongph.dev/mcp-core";

export { McpError, isMcpError, configError, invalidInput } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Internal error taxonomy for the Backlog MCP server
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "API_KEY_MISSING"
  | "BACKLOG_HTTP_ERROR"
  | "BACKLOG_RESPONSE_ERROR"
  | "CONFIG_ERROR"
  | "INVALID_INPUT";

// ---------------------------------------------------------------------------
// Factory helpers — keeps call sites concise
// ---------------------------------------------------------------------------

export function apiKeyMissing(message = "BACKLOG_API_KEY is not configured."): McpError {
  return new McpError("API_KEY_MISSING", message);
}

export function backlogHttpError(status: number, url: string, body?: string): McpError {
  return new McpError(
    "BACKLOG_HTTP_ERROR",
    `Backlog HTTP ${status} from ${url}`,
    { status, url, body }
  );
}

export function backlogResponseError(message: string, raw?: unknown): McpError {
  return new McpError("BACKLOG_RESPONSE_ERROR", message, raw);
}
