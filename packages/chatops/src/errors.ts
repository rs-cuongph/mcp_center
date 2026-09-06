import { McpError } from "@cuongph.dev/mcp-core";

export { McpError, isMcpError, configError, invalidInput } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Internal error taxonomy for the ChatOps MCP server
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "AUTH_ERROR"
  | "CHATOPS_HTTP_ERROR"
  | "CHATOPS_RESPONSE_ERROR"
  | "CONFIG_ERROR"
  | "INVALID_INPUT";

// ---------------------------------------------------------------------------
// Factory helpers — keeps call sites concise
// ---------------------------------------------------------------------------

export function authRequired(
  message = "No ChatOps session found. Run `chatops-auth-login` to authenticate."
): McpError {
  return new McpError("AUTH_REQUIRED", message);
}

export function sessionExpired(
  message = "ChatOps session expired or rejected. Run `chatops-auth-login` to reauthenticate."
): McpError {
  return new McpError("SESSION_EXPIRED", message);
}

export function authError(message?: string): McpError {
  return sessionExpired(message);
}

export function chatopsHttpError(status: number, url: string, body?: string): McpError {
  return new McpError(
    "CHATOPS_HTTP_ERROR",
    `ChatOps HTTP ${status} from ${url}`,
    { status, url, body }
  );
}

export function chatopsResponseError(message: string, raw?: unknown): McpError {
  return new McpError("CHATOPS_RESPONSE_ERROR", message, raw);
}
