import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError } from "../errors.js";
import type { ChatOpsUser } from "../types.js";

export interface GetUserInput {
  userId?: string;
  username?: string;
}

function formatUser(u: ChatOpsUser): string {
  const lines = [
    `## @${u.username}`,
    "",
    `- **Display name**: ${u.displayName}`,
    `- **ID**: \`${u.id}\``,
  ];
  if (u.email)    lines.push(`- **Email**: ${u.email}`);
  if (u.position) lines.push(`- **Position**: ${u.position}`);
  if (u.roles.length) lines.push(`- **Roles**: ${u.roles.join(", ")}`);
  lines.push(`- **Joined**: ${u.createdAt}`);
  lines.push("", "---", `💡 Use \`chatops_search_posts\` with terms \`from:${u.username}\` to find this user's messages.`);
  return lines.join("\n");
}

export async function handleGetUser(
  input: GetUserInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  if (!input.userId && !input.username) {
    return errorContent("Provide either userId or username.");
  }

  const client = await createClient(cfg);
  try {
    const user = input.userId
      ? await client.getUser(input.userId)
      : await client.getUserByName(input.username!);

    return { content: [{ type: "text", text: formatUser(user) }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    const lookup = input.userId ?? input.username;
    return errorContent(`Failed to get user "${lookup}": ${msg}`);
  }
}
