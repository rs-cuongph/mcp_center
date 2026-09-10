// ---------------------------------------------------------------------------
// Domain types — normalized, stable output shapes
// Used by tool handlers and returned to the MCP client.
// These are intentionally free of GitLab API internals.
// ---------------------------------------------------------------------------

// ── User / auth ─────────────────────────────────────────────────────────────

export interface GitlabUser {
  id: number;
  username: string;
  name: string;
  state: string;
  webUrl: string;
}

export interface GitlabCurrentUser extends GitlabUser {
  email: string | null;
}

export interface GitlabVersion {
  version: string;
  revision: string;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface GitlabProject {
  id: number;
  name: string;
  nameWithNamespace: string;
  pathWithNamespace: string;
  description: string | null;
  defaultBranch: string | null;
  webUrl: string;
  visibility: string;
  archived: boolean;
  starCount: number;
  forksCount: number;
  lastActivityAt: string;
  openIssuesCount: number | null;
}

// ── Issues ───────────────────────────────────────────────────────────────────

/** Compact issue summary — returned inside gitlab_list_issues. */
export interface GitlabIssueSummary {
  iid: number;
  projectId: number;
  title: string;
  state: string;
  labels: string[];
  milestone: string | null;
  author: string;
  assignees: string[];
  webUrl: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  dueDate: string | null;
  confidential: boolean;
  userNotesCount: number;
}

/** Full issue detail — returned by gitlab_get_issue. Adds description. */
export interface GitlabIssue extends GitlabIssueSummary {
  description: string | null;
}

// ── Merge requests ───────────────────────────────────────────────────────────

/** Compact MR summary — returned inside gitlab_list_merge_requests. */
export interface GitlabMergeRequestSummary {
  iid: number;
  projectId: number;
  title: string;
  state: string;
  draft: boolean;
  mergeStatus: string;
  hasConflicts: boolean;
  targetBranch: string;
  sourceBranch: string;
  author: string;
  assignees: string[];
  labels: string[];
  webUrl: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  userNotesCount: number;
}

/** Full MR detail — returned by gitlab_get_merge_request. Adds description. */
export interface GitlabMergeRequest extends GitlabMergeRequestSummary {
  description: string | null;
}

export interface GitlabMrChangeSummary {
  path: string;
  isNew: boolean;
  isRenamed: boolean;
  isDeleted: boolean;
  additions: number;
  deletions: number;
}

// ── Notes / discussions ───────────────────────────────────────────────────────

export interface GitlabNote {
  id: number;
  body: string;
  author: string;
  createdAt: string;
  system: boolean;
}

export interface GitlabDiscussion {
  id: string;
  notes: GitlabNote[];
}

// ── Repository ────────────────────────────────────────────────────────────────

export interface GitlabCommit {
  id: string;
  shortId: string;
  title: string;
  authorName: string;
  authoredDate: string;
  webUrl: string;
}

export interface GitlabBranch {
  name: string;
  commitShortId: string;
  commitTitle: string;
  committedDate: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
  webUrl: string;
}

export interface GitlabFile {
  filePath: string;
  ref: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  content: string | null;
}

// ── CI / pipelines ────────────────────────────────────────────────────────────

export interface GitlabPipeline {
  id: number;
  iid: number;
  projectId: number;
  status: string;
  ref: string;
  sha: string;
  source: string;
  webUrl: string;
  createdAt: string;
  updatedAt: string;
  duration: number | null;
}

export interface GitlabJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
  webUrl: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface GitlabBlobSearchResult {
  projectId: number;
  path: string;
  filename: string;
  ref: string;
  startLine: number;
  snippet: string;
}

export interface GitlabCommitComment {
  note: string;
  path: string | null;
  line: number | null;
  lineType: string | null;
  author: string;
}
