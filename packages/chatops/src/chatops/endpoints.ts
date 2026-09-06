// ---------------------------------------------------------------------------
// ChatOps API v4 — endpoint URL builders
// All URLs are absolute (baseUrl + path). No trailing slashes.
// ---------------------------------------------------------------------------

const API = "/api/v4";

function url(base: string, path: string): string {
  return base.replace(/\/$/, "") + path;
}

// ── Users ────────────────────────────────────────────────────────────────────

/** GET /api/v4/users/:userId */
export function userUrl(baseUrl: string, userId: string): string {
  return url(baseUrl, `${API}/users/${encodeURIComponent(userId)}`);
}

/** GET /api/v4/users/username/:username */
export function userByNameUrl(baseUrl: string, username: string): string {
  return url(baseUrl, `${API}/users/username/${encodeURIComponent(username)}`);
}

/** POST /api/v4/users/search — search users by term */
export function searchUsersUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/users/search`);
}

/** POST /api/v4/users/ids — get users by IDs (batch) */
export function usersByIdsUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/users/ids`);
}

/** GET /api/v4/posts/:postId — get a single post by ID */
export function postUrl(baseUrl: string, postId: string): string {
  return url(baseUrl, `${API}/posts/${encodeURIComponent(postId)}`);
}

// ── Teams ────────────────────────────────────────────────────────────────────

/** GET /api/v4/users/me/teams — list teams the authenticated user belongs to */
export function teamsUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/users/me/teams`);
}

/** GET /api/v4/teams/:teamId */
export function teamUrl(baseUrl: string, teamId: string): string {
  return url(baseUrl, `${API}/teams/${encodeURIComponent(teamId)}`);
}

/** POST /api/v4/teams/search — search teams by term */
export function searchTeamsUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/teams/search`);
}

// ── Channels ─────────────────────────────────────────────────────────────────

/** GET /api/v4/teams/:teamId/channels — list public channels in a team */
export function teamChannelsUrl(baseUrl: string, teamId: string): string {
  return url(baseUrl, `${API}/teams/${encodeURIComponent(teamId)}/channels`);
}

/** POST /api/v4/teams/:teamId/channels/search — search channels in a team */
export function searchChannelsUrl(baseUrl: string, teamId: string): string {
  return url(baseUrl, `${API}/teams/${encodeURIComponent(teamId)}/channels/search`);
}

/** GET /api/v4/channels/:channelId */
export function channelUrl(baseUrl: string, channelId: string): string {
  return url(baseUrl, `${API}/channels/${encodeURIComponent(channelId)}`);
}

/** GET /api/v4/teams/:teamId/channels/name/:channelName — lookup by slug */
export function channelByNameUrl(
  baseUrl: string,
  teamId: string,
  channelName: string
): string {
  return url(
    baseUrl,
    `${API}/teams/${encodeURIComponent(teamId)}/channels/name/${encodeURIComponent(channelName)}`
  );
}

// ── Posts ────────────────────────────────────────────────────────────────────

/** GET /api/v4/channels/:channelId/posts — list posts in a channel */
export function channelPostsUrl(baseUrl: string, channelId: string): string {
  return url(baseUrl, `${API}/channels/${encodeURIComponent(channelId)}/posts`);
}

/** GET /api/v4/posts/:postId/thread — get a thread */
export function postThreadUrl(baseUrl: string, postId: string): string {
  return url(baseUrl, `${API}/posts/${encodeURIComponent(postId)}/thread`);
}

/** GET /api/v4/channels/:channelId/pinned — get pinned posts */
export function pinnedPostsUrl(baseUrl: string, channelId: string): string {
  return url(baseUrl, `${API}/channels/${encodeURIComponent(channelId)}/pinned`);
}

/** POST /api/v4/posts — create a post */
export function postsUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/posts`);
}

/** POST /api/v4/teams/:teamId/posts/search — full-text search of posts */
export function searchPostsUrl(baseUrl: string, teamId: string): string {
  return url(baseUrl, `${API}/teams/${encodeURIComponent(teamId)}/posts/search`);
}

/** GET /api/v4/files/:fileId/info — get metadata of a single uploaded file */
export function fileInfoUrl(baseUrl: string, fileId: string): string {
  return url(baseUrl, `${API}/files/${encodeURIComponent(fileId)}/info`);
}

/** POST /api/v4/teams/:teamId/files/search — search files/attachments in a team */
export function searchFilesUrl(baseUrl: string, teamId: string): string {
  return url(baseUrl, `${API}/teams/${encodeURIComponent(teamId)}/files/search`);
}

// ── Files ────────────────────────────────────────────────────────────────────

/** POST /api/v4/files — upload file(s) */
export function filesUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/files`);
}

// ── Reactions ────────────────────────────────────────────────────────────────

/** GET /api/v4/posts/:postId/reactions — list reactions on a post */
export function postReactionsUrl(baseUrl: string, postId: string): string {
  return url(baseUrl, `${API}/posts/${encodeURIComponent(postId)}/reactions`);
}

/** POST /api/v4/reactions — add a reaction to a post */
export function reactionsUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/reactions`);
}

/** GET /api/v4/users/me — get the authenticated user */
export function currentUserUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/users/me`);
}

// ── Emoji ────────────────────────────────────────────────────────────────────

/** GET /api/v4/emoji — list all custom emoji (paginated) */
export function emojiListUrl(baseUrl: string): string {
  return url(baseUrl, `${API}/emoji`);
}

/** GET /api/v4/emoji/:emojiId — get custom emoji by ID */
export function emojiUrl(baseUrl: string, emojiId: string): string {
  return url(baseUrl, `${API}/emoji/${encodeURIComponent(emojiId)}`);
}

/** GET /api/v4/emoji/name/:emojiName — get custom emoji by name/slug */
export function emojiByNameUrl(baseUrl: string, emojiName: string): string {
  return url(baseUrl, `${API}/emoji/name/${encodeURIComponent(emojiName)}`);
}
