// ---------------------------------------------------------------------------
// Batch user resolver — resolves userId → @username for post display
// Uses a single batch API call for efficiency.
// ---------------------------------------------------------------------------
import type { ChatOpsHttpClient } from "./chatops/http-client.js";
import type { ChatOpsUser } from "./types.js";

/** Map of userId → display label like "@username" */
export type UserMap = Map<string, string>;

/**
 * Given a list of posts (or any objects with userId), batch-resolve all unique
 * user IDs into a lookup map.
 *
 * Returns `Map<userId, "@username">`.
 * Failed lookups silently fall back to the raw ID.
 */
export async function resolveUsers(
  client: ChatOpsHttpClient,
  userIds: string[]
): Promise<UserMap> {
  const unique = [...new Set(userIds)];
  const map: UserMap = new Map();

  // Pre-fill with raw IDs as fallback
  for (const id of unique) map.set(id, `\`${id}\``);

  if (unique.length === 0) return map;

  try {
    const users = await client.getUsersByIds(unique);
    for (const u of users) {
      map.set(u.id, `@${u.username}`);
    }
  } catch {
    // Silently fall back to raw IDs if batch call fails
  }

  return map;
}

/** Convenience: given posts, extract unique userIds and resolve them. */
export async function resolvePostAuthors(
  client: ChatOpsHttpClient,
  posts: Array<{ userId: string }>
): Promise<UserMap> {
  return resolveUsers(client, posts.map((p) => p.userId));
}
