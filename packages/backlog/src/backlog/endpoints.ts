// ---------------------------------------------------------------------------
// Centralized Backlog REST API endpoint builders
// All endpoints target Backlog API v2
// ---------------------------------------------------------------------------

const API_BASE = "/api/v2";

/**
 * URL for the issue list endpoint.
 * @example issueListUrl("https://space.backlog.com")
 *   → "https://space.backlog.com/api/v2/issues"
 */
export function issueListUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/issues`;
}

/**
 * URL for a single issue.
 * @example issueUrl("https://space.backlog.com", "BLG-1")
 *   → "https://space.backlog.com/api/v2/issues/BLG-1"
 */
export function issueUrl(baseUrl: string, issueIdOrKey: string): string {
  return `${baseUrl}${API_BASE}/issues/${encodeURIComponent(issueIdOrKey)}`;
}

/**
 * URL for the comments list of an issue.
 * @example commentsUrl("https://space.backlog.com", "BLG-1")
 *   → "https://space.backlog.com/api/v2/issues/BLG-1/comments"
 */
export function commentsUrl(baseUrl: string, issueIdOrKey: string): string {
  return `${issueUrl(baseUrl, issueIdOrKey)}/comments`;
}

/**
 * Constructs the human-facing issue view URL.
 * @example issueViewUrl("https://space.backlog.com", "BLG-1")
 *   → "https://space.backlog.com/view/BLG-1"
 */
export function issueViewUrl(baseUrl: string, issueKey: string): string {
  return `${baseUrl}/view/${issueKey}`;
}

/**
 * URL for the statuses of a project.
 * @example projectStatusesUrl("https://space.backlog.com", "MYPROJ")
 *   → "https://space.backlog.com/api/v2/projects/MYPROJ/statuses"
 */
export function projectStatusesUrl(baseUrl: string, projectIdOrKey: string): string {
  return `${baseUrl}${API_BASE}/projects/${encodeURIComponent(projectIdOrKey)}/statuses`;
}

/**
 * URL for the global priorities list (not project-scoped).
 * @example prioritiesUrl("https://space.backlog.com")
 *   → "https://space.backlog.com/api/v2/priorities"
 */
export function prioritiesUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/priorities`;
}

/**
 * URL for the categories of a project.
 * @example projectCategoriesUrl("https://space.backlog.com", "MYPROJ")
 *   → "https://space.backlog.com/api/v2/projects/MYPROJ/categories"
 */
export function projectCategoriesUrl(baseUrl: string, projectIdOrKey: string): string {
  return `${baseUrl}${API_BASE}/projects/${encodeURIComponent(projectIdOrKey)}/categories`;
}

/**
 * URL for the versions (milestones) of a project.
 * @example projectVersionsUrl("https://space.backlog.com", "MYPROJ")
 *   → "https://space.backlog.com/api/v2/projects/MYPROJ/versions"
 */
export function projectVersionsUrl(baseUrl: string, projectIdOrKey: string): string {
  return `${baseUrl}${API_BASE}/projects/${encodeURIComponent(projectIdOrKey)}/versions`;
}

/**
 * URL for the list of all projects.
 * @example projectsUrl("https://space.backlog.com")
 *   → "https://space.backlog.com/api/v2/projects"
 */
export function projectsUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/projects`;
}

/**
 * URL for a single project (used to resolve a project key to its numeric ID).
 * @example singleProjectUrl("https://space.backlog.com", "MYPROJ")
 *   → "https://space.backlog.com/api/v2/projects/MYPROJ"
 */
export function singleProjectUrl(baseUrl: string, projectIdOrKey: string): string {
  return `${baseUrl}${API_BASE}/projects/${encodeURIComponent(projectIdOrKey)}`;
}

/**
 * URL for project member list.
 * @example projectUsersUrl("https://space.backlog.com", "MYPROJ")
 *   → "https://space.backlog.com/api/v2/projects/MYPROJ/users"
 */
export function projectUsersUrl(baseUrl: string, projectIdOrKey: string): string {
  return `${baseUrl}${API_BASE}/projects/${encodeURIComponent(projectIdOrKey)}/users`;
}

/**
 * URL to list attachments on an issue.
 * @example issueAttachmentsUrl("https://space.backlog.com", "BLG-123")
 *   → "https://space.backlog.com/api/v2/issues/BLG-123/attachments"
 */
export function issueAttachmentsUrl(baseUrl: string, issueIdOrKey: string): string {
  return `${baseUrl}${API_BASE}/issues/${encodeURIComponent(issueIdOrKey)}/attachments`;
}

/**
 * URL to download a specific attachment from an issue.
 * @example issueAttachmentDownloadUrl("https://space.backlog.com", "BLG-123", 42)
 *   → "https://space.backlog.com/api/v2/issues/BLG-123/attachments/42"
 */
export function issueAttachmentDownloadUrl(
  baseUrl: string,
  issueIdOrKey: string,
  attachmentId: number
): string {
  return `${baseUrl}${API_BASE}/issues/${encodeURIComponent(issueIdOrKey)}/attachments/${attachmentId}`;
}
