import { z } from "zod";
import { GitlabHttpClient } from "../gitlab/http-client.js";
import { isMcpError } from "../errors.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";
import type { GitlabCurrentUser } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const getCurrentUserSchema = z.object({});

export type GetCurrentUserInput = z.infer<typeof getCurrentUserSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleGetCurrentUser(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getCurrentUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const client = new GitlabHttpClient(cfg.GITLAB_URL, cfg.GITLAB_TOKEN);

  try {
    const user = await client.getCurrentUser(cfg.GITLAB_VALIDATE_PATH);
    const version = await client.tryGetVersion();
    return { content: [{ type: "text", text: formatCurrentUser(user, version, cfg.GITLAB_URL) }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatCurrentUser(
  user: GitlabCurrentUser,
  version: { version: string; revision: string } | null,
  instanceUrl: string
): string {
  const lines: string[] = [];

  lines.push(`# GitLab Connection OK`);
  lines.push(``);
  lines.push(`- **Instance:** ${instanceUrl}`);
  lines.push(`- **User:** ${user.name} (@${user.username})`);
  if (user.email) lines.push(`- **Email:** ${user.email}`);
  lines.push(`- **State:** ${user.state}`);
  lines.push(`- **Profile:** ${user.webUrl}`);
  lines.push(
    version
      ? `- **GitLab version:** ${version.version} (${version.revision})`
      : `- **GitLab version:** unavailable (token lacks permission or endpoint disabled)`
  );

  lines.push(navigationHint(['`gitlab_list_projects(membership: true)` — list your accessible projects']));

  return lines.join("\n");
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
