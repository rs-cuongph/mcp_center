// ---------------------------------------------------------------------------
// Shared utility functions
// ---------------------------------------------------------------------------

/**
 * Formats an ISO timestamp to a human-readable local date-time string.
 * Returns "—" for null/empty input.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Truncates a string to the given max length, appending "…" if truncated.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

/**
 * Formats a byte size to a human-readable string (e.g. 1536 → "1.5 KB").
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Normalizes a labels input (array of names or a comma-separated string) into
 * a trimmed array. Returns undefined when no labels were provided.
 */
export function parseLabels(labels: string | string[] | undefined): string[] | undefined {
  if (labels == null) return undefined;
  return Array.isArray(labels) ? labels : labels.split(",").map((l) => l.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Navigation hints
// ---------------------------------------------------------------------------

/**
 * Renders a navigation hint block appended to the end of tool output.
 * Helps LLMs know which tool to call next for agentic chaining.
 *
 * @param hints - Each entry is one suggested next action (plain text or inline code)
 * @returns A formatted markdown block, or empty string if no hints provided
 *
 * @example
 * navigationHint([
 *   "`gitlab_get_issue(projectId: \"group/proj\", iid: 12)`",
 * ])
 */
export function navigationHint(hints: string[]): string {
  if (hints.length === 0) return "";
  const lines = hints.map((h) => `- ${h}`);
  return `\n\n---\n💡 **Next:**\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PageMeta {
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
}

/**
 * Renders a compact pagination footer line, e.g.
 * "Page 1 of 4 (78 total) — use page: 2 for more"
 */
export function formatPageFooter(meta: PageMeta, resultCount: number): string {
  const parts = [`Page ${meta.page}`];
  if (meta.totalPages != null) parts.push(`of ${meta.totalPages}`);
  if (meta.total != null) parts.push(`(${meta.total} total)`);
  parts.push(`— showing ${resultCount} per page ${meta.perPage}`);
  return parts.join(" ");
}
