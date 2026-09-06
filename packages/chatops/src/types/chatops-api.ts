// ---------------------------------------------------------------------------
// Raw ChatOps API response types (API v4 compatible)
// These types mirror the exact JSON shapes returned by the ChatOps REST API.
// NEVER use these types outside http-client.ts and mappers.ts.
// ---------------------------------------------------------------------------

// ── Users ───────────────────────────────────────────────────────────────────

export interface ChatOpsRawUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  position: string;
  roles: string;          // e.g. "system_admin system_user"
  locale: string;
  create_at: number;
  update_at: number;
  delete_at: number;
}

// ── Teams ───────────────────────────────────────────────────────────────────

export interface ChatOpsRawTeam {
  id: string;
  display_name: string;
  name: string;         // URL slug
  description: string;
  type: string;         // "O" = open, "I" = invite-only
  create_at: number;    // Unix ms
  update_at: number;    // Unix ms
  delete_at: number;    // 0 if not deleted
  allow_open_invite: boolean;
}

// ── Channels ─────────────────────────────────────────────────────────────────

export interface ChatOpsRawChannel {
  id: string;
  team_id: string;
  type: string;            // "O" = public, "P" = private, "D" = DM, "G" = group
  display_name: string;
  name: string;            // URL slug
  header: string;
  purpose: string;
  total_msg_count: number;
  create_at: number;
  update_at: number;
  delete_at: number;
  last_post_at: number;
}

// ── Posts ────────────────────────────────────────────────────────────────────

export interface ChatOpsRawPost {
  id: string;
  channel_id: string;
  user_id: string;
  root_id: string;          // "" if top-level post
  message: string;
  type: string;             // "" = normal, "system_*" = system messages
  create_at: number;
  update_at: number;
  delete_at: number;
  file_ids?: string[];
  metadata?: {
    files?: ChatOpsRawFileInfo[];
  };
}

export interface ChatOpsRawPostList {
  order: string[];
  posts: Record<string, ChatOpsRawPost>;
  next_post_id?: string;
  prev_post_id?: string;
}

// ── Files ────────────────────────────────────────────────────────────────────

export interface ChatOpsRawFileInfo {
  id: string;
  user_id: string;
  post_id?: string;
  channel_id?: string;
  name: string;
  extension: string;
  size: number;
  mime_type: string;
  create_at: number;
  update_at: number;
}

export interface ChatOpsRawFileUploadResponse {
  file_infos: ChatOpsRawFileInfo[];
  client_ids?: string[];
}

// ── Reactions ────────────────────────────────────────────────────────────────

export interface ChatOpsRawReaction {
  user_id: string;
  post_id: string;
  emoji_name: string;
  create_at: number;   // Unix ms
}

// ── Post Search ───────────────────────────────────────────────────────────────

export interface ChatOpsRawPostSearchResults {
  order: string[];
  posts: Record<string, ChatOpsRawPost>;
}

// ── File Search ───────────────────────────────────────────────────────────────

export interface ChatOpsRawFileSearchResults {
  order?: string[];
  file_infos?: Record<string, ChatOpsRawFileInfo>;
}

// ── Emoji ────────────────────────────────────────────────────────────────────

export interface ChatOpsRawEmoji {
  id: string;
  creator_id: string;
  name: string;        // emoji slug, used in :name:
  create_at: number;   // Unix ms
  update_at: number;   // Unix ms
  delete_at: number;   // 0 if active
}
