import type {
  ChatOpsRawUser,
  ChatOpsRawTeam,
  ChatOpsRawChannel,
  ChatOpsRawPost,
  ChatOpsRawPostList,
  ChatOpsRawFileInfo,
  ChatOpsRawReaction,
  ChatOpsRawEmoji,
} from "../types/chatops-api.js";
import type {
  ChatOpsUser,
  ChatOpsTeam,
  ChatOpsChannel,
  ChatOpsPost,
  ChatOpsPostList,
  ChatOpsFileInfo,
  ChatOpsFileUploadResult,
  ChatOpsReaction,
  ChatOpsEmoji,
} from "../types.js";
import { formatTimestamp, formatFileSize, channelTypeLabel, teamTypeLabel } from "../utils.js";

// ── Users ────────────────────────────────────────────────────────────────────

export function mapUser(raw: ChatOpsRawUser): ChatOpsUser {
  const displayName = raw.nickname
    || [raw.first_name, raw.last_name].filter(Boolean).join(" ")
    || raw.username;
  return {
    id: raw.id,
    username: raw.username,
    displayName,
    email: raw.email,
    position: raw.position,
    roles: raw.roles.split(" ").filter(Boolean),
    createdAt: formatTimestamp(raw.create_at),
  };
}

// ── Teams ────────────────────────────────────────────────────────────────────

export function mapTeam(raw: ChatOpsRawTeam): ChatOpsTeam {
  return {
    id: raw.id,
    displayName: raw.display_name,
    name: raw.name,
    description: raw.description,
    type: teamTypeLabel(raw.type),
    allowOpenInvite: raw.allow_open_invite ?? false,
    createdAt: formatTimestamp(raw.create_at),
  };
}

// ── Channels ─────────────────────────────────────────────────────────────────

export function mapChannel(raw: ChatOpsRawChannel): ChatOpsChannel {
  return {
    id: raw.id,
    teamId: raw.team_id,
    type: channelTypeLabel(raw.type),
    displayName: raw.display_name,
    name: raw.name,
    header: raw.header,
    purpose: raw.purpose,
    totalMsgCount: raw.total_msg_count,
    lastPostAt: raw.last_post_at ? formatTimestamp(raw.last_post_at) : "",
  };
}

// ── Files ────────────────────────────────────────────────────────────────────

export function mapFileInfo(raw: ChatOpsRawFileInfo): ChatOpsFileInfo {
  return {
    id: raw.id,
    name: raw.name,
    extension: raw.extension,
    size: raw.size,
    sizeFormatted: formatFileSize(raw.size),
    mimeType: raw.mime_type,
    postId: raw.post_id,
    channelId: raw.channel_id,
    createdAt: raw.create_at ? formatTimestamp(raw.create_at) : undefined,
  };
}

export function mapFileUploadResult(raw: ChatOpsRawFileInfo): ChatOpsFileUploadResult {
  return {
    fileId: raw.id,
    name: raw.name,
    size: raw.size,
    sizeFormatted: formatFileSize(raw.size),
    mimeType: raw.mime_type,
  };
}

// ── Posts ────────────────────────────────────────────────────────────────────

export function mapPost(raw: ChatOpsRawPost): ChatOpsPost {
  const files: ChatOpsFileInfo[] = (raw.metadata?.files ?? []).map(mapFileInfo);
  return {
    id: raw.id,
    channelId: raw.channel_id,
    userId: raw.user_id,
    rootId: raw.root_id || null,
    message: raw.message,
    createdAt: formatTimestamp(raw.create_at),
    updatedAt: formatTimestamp(raw.update_at),
    fileIds: raw.file_ids ?? [],
    files,
  };
}

export function mapPostList(raw: ChatOpsRawPostList): ChatOpsPostList {
  const posts = (raw.order ?? [])
    .map((id) => raw.posts[id])
    .filter((p): p is ChatOpsRawPost => !!p && p.delete_at === 0)
    .map(mapPost);

  return {
    order: raw.order ?? [],
    posts,
    totalCount: posts.length,
  };
}

// ── Reactions ─────────────────────────────────────────────────────────────────

export function mapReaction(raw: ChatOpsRawReaction): ChatOpsReaction {
  return {
    userId: raw.user_id,
    postId: raw.post_id,
    emojiName: raw.emoji_name,
    createdAt: formatTimestamp(raw.create_at),
  };
}

// ── Emoji ─────────────────────────────────────────────────────────────

export function mapEmoji(raw: ChatOpsRawEmoji): ChatOpsEmoji {
  return {
    id: raw.id,
    creatorId: raw.creator_id,
    name: raw.name,
    createdAt: formatTimestamp(raw.create_at),
    updatedAt: formatTimestamp(raw.update_at),
  };
}
