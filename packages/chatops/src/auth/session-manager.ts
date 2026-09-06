import axios from "axios";
import { readSession } from "./session-store.js";
import { authRequired, sessionExpired } from "../errors.js";
import type { SessionCookies } from "../types.js";
import type { SessionFile } from "@cuongph.dev/mcp-auth-playwright";
import { extractMatchedCookies } from "@cuongph.dev/mcp-auth-playwright";

// ---------------------------------------------------------------------------
// Cookie extraction
// ---------------------------------------------------------------------------

/**
 * Converts Playwright cookie objects into an HTTP Cookie header string.
 * Only includes cookies whose domain matches the base URL host.
 */
export function extractCookies(session: SessionFile, baseUrl: string): SessionCookies {
  const { cookieHeader, cookies } = extractMatchedCookies(session, baseUrl);
  // Mattermost requires X-CSRF-Token header (value = MMCSRF cookie) for all write requests
  const csrfToken = cookies.find((c) => c.name === "MMCSRF")?.value;
  return { cookieHeader, csrfToken };
}

// ---------------------------------------------------------------------------
// Session validation
// ---------------------------------------------------------------------------

/**
 * Loads the session from disk and validates it against the ChatOps REST API.
 * Returns SessionCookies ready for use in HTTP requests.
 * Throws McpError(AUTH_REQUIRED) if session file is missing.
 * Throws McpError(SESSION_EXPIRED) if the session was rejected or redirect loop.
 */
export async function loadAndValidateSession(
  sessionFilePath: string,
  baseUrl: string,
  validatePath: string
): Promise<SessionCookies> {
  const session = await readSession(sessionFilePath);

  if (session === null) {
    throw authRequired();
  }

  const cookies = extractCookies(session, baseUrl);
  const validateUrl = `${baseUrl.replace(/\/$/, "")}${validatePath}`;

  try {
    const res = await axios.get(validateUrl, {
      headers: {
        Cookie: cookies.cookieHeader,
        Accept: "application/json",
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    if (isLoginPageResponse(res.data)) {
      throw sessionExpired();
    }

    return cookies;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (
        status === 401 ||
        status === 403 ||
        (status !== undefined && status >= 300 && status < 400)
      ) {
        throw sessionExpired();
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isLoginPageResponse(body: unknown): boolean {
  if (typeof body !== "string") return false;
  const lower = body.toLowerCase();
  return (
    lower.startsWith("<!") &&
    (lower.includes("log in") || lower.includes("login") || lower.includes("sso"))
  );
}
