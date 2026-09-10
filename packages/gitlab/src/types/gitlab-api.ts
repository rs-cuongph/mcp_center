// ---------------------------------------------------------------------------
// Raw GitLab REST API v4 response types
// These mirror exactly what the GitLab API returns.
// Do NOT use these types outside of http-client.ts and mappers.ts.
// ---------------------------------------------------------------------------

export interface GitlabRawVersion {
  version: string;
  revision: string;
}

export interface GitlabRawUser {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string | null;
  web_url: string;
  email?: string | null;
}

export interface GitlabRawNamespace {
  id: number;
  name: string;
  path: string;
  kind: string;
  full_path: string;
}

export interface GitlabRawProject {
  id: number;
  description: string | null;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  default_branch: string | null;
  web_url: string;
  visibility: string;
  star_count: number;
  forks_count: number;
  archived: boolean;
  last_activity_at: string;
  namespace: GitlabRawNamespace;
  open_issues_count?: number;
}

export interface GitlabRawMilestone {
  id: number;
  iid: number;
  title: string;
  state: string;
  due_date: string | null;
}

export interface GitlabRawIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: string;
  labels: string[];
  milestone: GitlabRawMilestone | null;
  assignees: GitlabRawUser[];
  author: GitlabRawUser;
  web_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  due_date: string | null;
  confidential: boolean;
  user_notes_count: number;
  upvotes: number;
  downvotes: number;
}

export interface GitlabRawMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: string;
  draft: boolean;
  merge_status: string;
  has_conflicts: boolean;
  target_branch: string;
  source_branch: string;
  author: GitlabRawUser;
  assignees: GitlabRawUser[];
  reviewers?: GitlabRawUser[];
  labels: string[];
  web_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  sha: string | null;
  user_notes_count: number;
  upvotes: number;
  downvotes: number;
}

export interface GitlabRawNote {
  id: number;
  body: string;
  author: GitlabRawUser;
  created_at: string;
  updated_at: string;
  system: boolean;
  resolvable?: boolean;
  resolved?: boolean;
}

export interface GitlabRawDiscussion {
  id: string;
  individual_note: boolean;
  notes: GitlabRawNote[];
}

export interface GitlabRawCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committed_date: string;
  web_url: string;
}

export interface GitlabRawBranchCommit {
  id: string;
  short_id: string;
  title: string;
  committed_date: string;
}

export interface GitlabRawBranch {
  name: string;
  commit: GitlabRawBranchCommit;
  merged: boolean;
  protected: boolean;
  default: boolean;
  web_url: string;
}

export interface GitlabRawPipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  source: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  duration: number | null;
}

export interface GitlabRawJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  web_url: string;
}

/** GET /projects/:id/repository/files/:path — file metadata + base64 content */
export interface GitlabRawFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

/** GET /projects/:id/merge_requests/:iid/changes (or /diffs) — one changed file */
export interface GitlabRawMrChange {
  old_path: string;
  new_path: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
  diff: string;
}

/** GET /search or /projects/:id/search with scope=blobs */
export interface GitlabRawBlobSearchResult {
  basename: string;
  data: string;
  path: string;
  filename: string;
  id: string | null;
  ref: string;
  startline: number;
  project_id: number;
}
