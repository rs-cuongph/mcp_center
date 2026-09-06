import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { navigationHint } from "../utils.js";
import type { Config } from "../config.js";

export const getComponentsSchema = z.object({
  projectKey: z.string().min(1, "projectKey is required"),
});

export async function handleGetComponents(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getComponentsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  let sessionCookies;
  try {
    sessionCookies = await loadAndValidateSession(
      cfg.JIRA_SESSION_FILE,
      cfg.JIRA_BASE_URL,
      cfg.JIRA_VALIDATE_PATH
    );
  } catch (err: unknown) {
    if (isMcpError(err)) return authErrorContent(err.code, err.message);
    throw err;
  }

  try {
    const client = new JiraHttpClient(cfg.JIRA_BASE_URL, sessionCookies);
    const components = await client.getComponents(parsed.data.projectKey);
    const lines = [
      `# Jira Components`,
      "",
      `**Project:** ${parsed.data.projectKey}`,
      "",
      `| ID | Name | Description |`,
      `|---|---|---|`,
    ];
    for (const component of components) {
      lines.push(`| ${component.id} | ${component.name} | ${component.description ?? "—"} |`);
    }
    const hint = navigationHint(
      `\`jira_create_issue({...})\` to create an issue in project ${parsed.data.projectKey}`,
      `\`jira_update_issue_fields({issueKey: "<key>", fields: {components: [...]}})\` to update components`,
    );
    return { content: [{ type: "text", text: lines.join("\n") + hint }] };
  } catch (err: unknown) {
    if (isMcpError(err)) return errorContent(`[${err.code}] ${err.message}`);
    if (err instanceof Error) return errorContent(err.message);
    throw err;
  }
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function authErrorContent(code: string, message: string) {
  return { isError: true as const, content: [{ type: "text" as const, text: `[${code}] ${message}` }] };
}
