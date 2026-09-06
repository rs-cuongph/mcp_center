import type { PlaywrightCookie, SessionFile } from "./types.js";

export function extractMatchedCookies(
  session: SessionFile,
  baseUrl: string
): { cookieHeader: string; cookies: PlaywrightCookie[] } {
  const host = new URL(baseUrl).hostname;
  const cookies: PlaywrightCookie[] =
    session.storageState.cookies?.filter((c) =>
      host.endsWith(c.domain.replace(/^\./, ""))
    ) ?? [];
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  return { cookieHeader, cookies };
}
