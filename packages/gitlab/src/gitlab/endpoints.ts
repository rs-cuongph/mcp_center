// ---------------------------------------------------------------------------
// Centralized GitLab REST API endpoint builders
// All endpoints target GitLab API v4
// ---------------------------------------------------------------------------

const API_BASE = "/api/v4";

/**
 * Encodes a project identifier for use in a URL path segment.
 * GitLab accepts either a numeric project ID (used as-is) or a
 * `namespace/project` path (must be URL-encoded as a single segment).
 *
 * @example encodeProjectId("123") → "123"
 * @example encodeProjectId("mygroup/myproject") → "mygroup%2Fmyproject"
 */
export function encodeProjectId(idOrPath: string): string {
  return /^\d+$/.test(idOrPath) ? idOrPath : encodeURIComponent(idOrPath);
}

/** URL for the instance version endpoint. */
export function versionUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/version`;
}

/** URL for the project list / project search endpoint. */
export function projectsUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/projects`;
}

/**
 * URL for a single project.
 * @example projectUrl("https://gitlab.co", "mygroup/myproject")
 *   → "https://gitlab.co/api/v4/projects/mygroup%2Fmyproject"
 */
export function projectUrl(baseUrl: string, projectIdOrPath: string): string {
  return `${projectsUrl(baseUrl)}/${encodeProjectId(projectIdOrPath)}`;
}

/** URL for global search. */
export function searchUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/search`;
}

/** URL for search scoped to a single project. */
export function projectSearchUrl(baseUrl: string, projectIdOrPath: string): string {
  return `${projectUrl(baseUrl, projectIdOrPath)}/search`;
}

/** URL for the global issue list (issues visible to the authenticated user). */
export function issuesUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/issues`;
}

/** URL for the issue list of one project. */
export function projectIssuesUrl(baseUrl: string, projectIdOrPath: string): string {
  return `${projectUrl(baseUrl, projectIdOrPath)}/issues`;
}

/** URL for a single project issue. */
export function projectIssueUrl(baseUrl: string, projectIdOrPath: string, issueIid: number): string {
  return `${projectIssuesUrl(baseUrl, projectIdOrPath)}/${issueIid}`;
}

/** URL for the notes (comments) of a project issue. */
export function projectIssueNotesUrl(baseUrl: string, projectIdOrPath: string, issueIid: number): string {
  return `${projectIssueUrl(baseUrl, projectIdOrPath, issueIid)}/notes`;
}

/** URL for the global merge-request list (MRs visible to the authenticated user). */
export function mergeRequestsUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/merge_requests`;
}

/** URL for the merge-request list of one project. */
export function projectMergeRequestsUrl(baseUrl: string, projectIdOrPath: string): string {
  return `${projectUrl(baseUrl, projectIdOrPath)}/merge_requests`;
}

/** URL for a single project merge request. */
export function projectMergeRequestUrl(
  baseUrl: string,
  projectIdOrPath: string,
  mrIid: number
): string {
  return `${projectMergeRequestsUrl(baseUrl, projectIdOrPath)}/${mrIid}`;
}

/** URL for the notes (comments) of a project merge request. */
export function projectMergeRequestNotesUrl(
  baseUrl: string,
  projectIdOrPath: string,
  mrIid: number
): string {
  return `${projectMergeRequestUrl(baseUrl, projectIdOrPath, mrIid)}/notes`;
}

/** URL for the top-level discussions (review notes) of a merge request. */
export function projectMergeRequestDiscussionsUrl(
  baseUrl: string,
  projectIdOrPath: string,
  mrIid: number
): string {
  return `${projectMergeRequestUrl(baseUrl, projectIdOrPath, mrIid)}/discussions`;
}

/** URL for the changed-files diff summary of a merge request. */
export function projectMergeRequestChangesUrl(
  baseUrl: string,
  projectIdOrPath: string,
  mrIid: number
): string {
  return `${projectMergeRequestUrl(baseUrl, projectIdOrPath, mrIid)}/changes`;
}

/** URL for the commit list of a project's repository. */
export function projectCommitsUrl(baseUrl: string, projectIdOrPath: string): string {
  return `${projectUrl(baseUrl, projectIdOrPath)}/repository/commits`;
}

/**
 * URL for a repository file's metadata + base64 content.
 * @example projectFileUrl("https://gitlab.co", "1", "src/index.ts")
 *   → "https://gitlab.co/api/v4/projects/1/repository/files/src%2Findex.ts"
 */
export function projectFileUrl(baseUrl: string, projectIdOrPath: string, filePath: string): string {
  return `${projectUrl(baseUrl, projectIdOrPath)}/repository/files/${encodeURIComponent(filePath)}`;
}

/** URL for the branch list of a project's repository. */
export function projectBranchesUrl(baseUrl: string, projectIdOrPath: string): string {
  return `${projectUrl(baseUrl, projectIdOrPath)}/repository/branches`;
}

/** URL for the pipeline list of a project. */
export function projectPipelinesUrl(baseUrl: string, projectIdOrPath: string): string {
  return `${projectUrl(baseUrl, projectIdOrPath)}/pipelines`;
}

/** URL for a single project pipeline. */
export function projectPipelineUrl(
  baseUrl: string,
  projectIdOrPath: string,
  pipelineId: number
): string {
  return `${projectPipelinesUrl(baseUrl, projectIdOrPath)}/${pipelineId}`;
}

/** URL for the jobs of a pipeline. */
export function projectPipelineJobsUrl(
  baseUrl: string,
  projectIdOrPath: string,
  pipelineId: number
): string {
  return `${projectPipelineUrl(baseUrl, projectIdOrPath, pipelineId)}/jobs`;
}
