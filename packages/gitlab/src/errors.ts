import { McpError } from "@cuongph.dev/mcp-core";

export { McpError, isMcpError, configError, invalidInput } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Internal error taxonomy for the GitLab MCP server
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "PERMISSION_DENIED"
  | "GITLAB_HTTP_ERROR"
  | "GITLAB_RESPONSE_ERROR"
  | "CONFIG_ERROR"
  | "INVALID_INPUT";

// ---------------------------------------------------------------------------
// Factory helpers — keeps call sites concise
// ---------------------------------------------------------------------------

export function authRequired(
  message = "GitLab token missing/invalid. Set GITLAB_TOKEN."
): McpError {
  return new McpError("AUTH_REQUIRED", message);
}

/**
 * GitLab returned 403 — the token is valid but lacks permission for this
 * resource. A new token will not fix this; the GitLab admin needs to grant
 * access to the project/group.
 */
export function permissionDenied(resource?: string): McpError {
  const what = resource ? ` to access ${resource}` : "";
  return new McpError(
    "PERMISSION_DENIED",
    `Your GitLab token does not have permission${what}. Ask a GitLab administrator to grant access, or use a token with a broader scope.`
  );
}

export function gitlabHttpError(status: number, url: string, body?: string): McpError {
  return new McpError(
    "GITLAB_HTTP_ERROR",
    `GitLab HTTP ${status} from ${url}`,
    { status, url, body }
  );
}

export function gitlabResponseError(message: string, raw?: unknown): McpError {
  return new McpError("GITLAB_RESPONSE_ERROR", message, raw);
}
