// ---------------------------------------------------------------------------
// Shared utility helpers for chatops-mcp
// ---------------------------------------------------------------------------
import type { Config } from "./config.js";
import { ChatOpsHttpClient } from "./chatops/http-client.js";
import { loadAndValidateSession } from "./auth/session-manager.js";

/**
 * Loads the persisted session and returns an authenticated HTTP client.
 * Throws AUTH_REQUIRED or SESSION_EXPIRED if the session is missing/invalid.
 * Call this at the top of every tool handler.
 */
export async function createClient(cfg: Config): Promise<ChatOpsHttpClient> {
  const cookies = await loadAndValidateSession(
    cfg.CHATOPS_SESSION_FILE,
    cfg.CHATOPS_URL,
    cfg.CHATOPS_VALIDATE_PATH
  );
  return new ChatOpsHttpClient(cfg.CHATOPS_URL, cookies);
}

/**
 * Formats a Unix timestamp (milliseconds) to ISO 8601 date string.
 * ChatOps API returns timestamps in milliseconds since epoch.
 */
export function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Maps a ChatOps channel type code to a human-readable label.
 */
export function channelTypeLabel(type: string): "public" | "private" | "direct" | "group" {
  switch (type) {
    case "O": return "public";
    case "P": return "private";
    case "D": return "direct";
    case "G": return "group";
    default: return "public";
  }
}

/**
 * Maps a ChatOps team type code to a human-readable label.
 */
export function teamTypeLabel(type: string): "open" | "invite-only" {
  return type === "I" ? "invite-only" : "open";
}

/**
 * Builds an error content response for MCP tool handlers.
 */
export function errorContent(message: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
