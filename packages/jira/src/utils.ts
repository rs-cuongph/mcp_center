// ---------------------------------------------------------------------------
// Shared utility functions
// ---------------------------------------------------------------------------

import dayjs from "dayjs";

/**
 * Returns today's date in yyyy-MM-dd format using the local timezone.
 */
export function todayLocalDate(): string {
  return dayjs().format("YYYY-MM-DD");
}

/**
 * Appends a navigation hint section to tool output markdown.
 *
 * Usage: append `navigationHint("...", "...")` to the end of any tool's formatted text.
 *
 * @param suggestions - Each suggestion is one actionable next step (tool call with params).
 */
export function navigationHint(...suggestions: string[]): string {
  return "\n\n---\n💡 **Next:** " + suggestions.join(" | ");
}

/**
 * Escapes a value for use inside a quoted JQL string literal.
 */
export function escapeJqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
