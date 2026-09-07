import axios from "axios";
import { authRequired, sessionExpired } from "../errors.js";
import type { SessionCookies } from "../types.js";

/** Builds an HTTP Basic Authorization value without persisting credentials. */
export function createBasicAuthorizationHeader(username: string, password: string): string {
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${auth}`;
}

export async function validateAuthorization(
  baseUrl: string,
  validatePath: string,
  authorizationHeader: string
): Promise<boolean> {
  try {
    const res = await axios.get(`${baseUrl}${validatePath}`, {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    return res.status >= 200 && res.status < 300 && !isLoginPageResponse(res.data);
  } catch {
    return false;
  }
}

/**
 * Validates Jira credentials via HTTP Basic Auth.
 *
 * Throws:
 * - `AUTH_REQUIRED` if JIRA_EMAIL or JIRA_PASSWORD is missing
 * - `SESSION_EXPIRED` if Jira rejects the Basic Auth credentials
 */
export async function loadAndValidateSession(
  baseUrl: string,
  validatePath: string
): Promise<SessionCookies> {
  const email = process.env.JIRA_EMAIL?.trim();
  const password = process.env.JIRA_PASSWORD;

  if (!email || !password) {
    throw authRequired("Set JIRA_EMAIL and JIRA_PASSWORD in .env (or MCP env).");
  }

  const authorizationHeader = createBasicAuthorizationHeader(email, password);

  if (await validateAuthorization(baseUrl, validatePath, authorizationHeader)) {
    return { cookieHeader: "", authorizationHeader };
  }

  throw sessionExpired("Basic Auth failed. Check JIRA_EMAIL/JIRA_PASSWORD.");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isLoginPageResponse(body: unknown): boolean {
  if (typeof body !== "string") return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("<title>log in") ||
    lower.includes("id=\"login-form\"") ||
    (lower.includes("sso") && lower.includes("<html"))
  );
}
