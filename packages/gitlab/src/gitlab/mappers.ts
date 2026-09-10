import type {
  GitlabRawUser,
  GitlabRawProject,
  GitlabRawIssue,
  GitlabRawMergeRequest,
  GitlabRawNote,
  GitlabRawDiscussion,
  GitlabRawCommit,
  GitlabRawBranch,
  GitlabRawPipeline,
  GitlabRawJob,
  GitlabRawMrChange,
  GitlabRawBlobSearchResult,
  GitlabRawCommitComment,
} from "../types/gitlab-api.js";
import type {
  GitlabUser,
  GitlabCurrentUser,
  GitlabProject,
  GitlabIssueSummary,
  GitlabIssue,
  GitlabMergeRequestSummary,
  GitlabMergeRequest,
  GitlabNote,
  GitlabDiscussion,
  GitlabCommit,
  GitlabBranch,
  GitlabPipeline,
  GitlabJob,
  GitlabMrChangeSummary,
  GitlabBlobSearchResult,
  GitlabCommitComment,
} from "../types.js";

// ---------------------------------------------------------------------------
// User mappers
// ---------------------------------------------------------------------------

export function mapUser(raw: GitlabRawUser): GitlabUser {
  return {
    id: raw.id,
    username: raw.username,
    name: raw.name,
    state: raw.state,
    webUrl: raw.web_url,
  };
}

export function mapCurrentUser(raw: GitlabRawUser): GitlabCurrentUser {
  return { ...mapUser(raw), email: raw.email ?? null };
}

// ---------------------------------------------------------------------------
// Project mapper
// ---------------------------------------------------------------------------

export function mapProject(raw: GitlabRawProject): GitlabProject {
  return {
    id: raw.id,
    name: raw.name,
    nameWithNamespace: raw.name_with_namespace,
    pathWithNamespace: raw.path_with_namespace,
    description: raw.description,
    defaultBranch: raw.default_branch,
    webUrl: raw.web_url,
    visibility: raw.visibility,
    archived: raw.archived,
    starCount: raw.star_count,
    forksCount: raw.forks_count,
    lastActivityAt: raw.last_activity_at,
    openIssuesCount: raw.open_issues_count ?? null,
  };
}

// ---------------------------------------------------------------------------
// Issue mappers
// ---------------------------------------------------------------------------

export function mapIssueSummary(raw: GitlabRawIssue): GitlabIssueSummary {
  return {
    iid: raw.iid,
    projectId: raw.project_id,
    title: raw.title,
    state: raw.state,
    labels: raw.labels,
    milestone: raw.milestone?.title ?? null,
    author: raw.author.username,
    assignees: raw.assignees.map((a) => a.username),
    webUrl: raw.web_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: raw.closed_at,
    dueDate: raw.due_date,
    confidential: raw.confidential,
    userNotesCount: raw.user_notes_count,
  };
}

export function mapIssue(raw: GitlabRawIssue): GitlabIssue {
  return { ...mapIssueSummary(raw), description: raw.description };
}

// ---------------------------------------------------------------------------
// Merge request mappers
// ---------------------------------------------------------------------------

export function mapMergeRequestSummary(raw: GitlabRawMergeRequest): GitlabMergeRequestSummary {
  return {
    iid: raw.iid,
    projectId: raw.project_id,
    title: raw.title,
    state: raw.state,
    draft: raw.draft,
    mergeStatus: raw.merge_status,
    hasConflicts: raw.has_conflicts,
    targetBranch: raw.target_branch,
    sourceBranch: raw.source_branch,
    author: raw.author.username,
    assignees: raw.assignees.map((a) => a.username),
    labels: raw.labels,
    webUrl: raw.web_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    mergedAt: raw.merged_at,
    closedAt: raw.closed_at,
    userNotesCount: raw.user_notes_count,
  };
}

export function mapMergeRequest(raw: GitlabRawMergeRequest): GitlabMergeRequest {
  return { ...mapMergeRequestSummary(raw), description: raw.description };
}

/**
 * Counts added/removed lines in a unified diff body, excluding the
 * `+++`/`---` file-header lines. GitLab's changes/diffs endpoints do not
 * return a numeric stat, so this is derived from the diff text itself.
 */
function countDiffStats(diff: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) additions++;
    else if (line.startsWith("-")) deletions++;
  }
  return { additions, deletions };
}

export function mapMrChange(raw: GitlabRawMrChange): GitlabMrChangeSummary {
  const { additions, deletions } = countDiffStats(raw.diff ?? "");
  return {
    path: raw.new_path || raw.old_path,
    isNew: raw.new_file,
    isRenamed: raw.renamed_file,
    isDeleted: raw.deleted_file,
    additions,
    deletions,
  };
}

// ---------------------------------------------------------------------------
// Note / discussion mappers
// ---------------------------------------------------------------------------

export function mapNote(raw: GitlabRawNote): GitlabNote {
  return {
    id: raw.id,
    body: raw.body,
    author: raw.author.username,
    createdAt: raw.created_at,
    system: raw.system,
  };
}

export function mapDiscussion(raw: GitlabRawDiscussion): GitlabDiscussion {
  return { id: raw.id, notes: raw.notes.map(mapNote) };
}

// ---------------------------------------------------------------------------
// Repository mappers
// ---------------------------------------------------------------------------

export function mapCommit(raw: GitlabRawCommit): GitlabCommit {
  return {
    id: raw.id,
    shortId: raw.short_id,
    title: raw.title,
    authorName: raw.author_name,
    authoredDate: raw.authored_date,
    webUrl: raw.web_url,
  };
}

export function mapBranch(raw: GitlabRawBranch): GitlabBranch {
  return {
    name: raw.name,
    commitShortId: raw.commit.short_id,
    commitTitle: raw.commit.title,
    committedDate: raw.commit.committed_date,
    merged: raw.merged,
    protected: raw.protected,
    default: raw.default,
    webUrl: raw.web_url,
  };
}

// ---------------------------------------------------------------------------
// CI / pipeline mappers
// ---------------------------------------------------------------------------

export function mapPipeline(raw: GitlabRawPipeline): GitlabPipeline {
  return {
    id: raw.id,
    iid: raw.iid,
    projectId: raw.project_id,
    status: raw.status,
    ref: raw.ref,
    sha: raw.sha,
    source: raw.source,
    webUrl: raw.web_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    duration: raw.duration,
  };
}

export function mapJob(raw: GitlabRawJob): GitlabJob {
  return {
    id: raw.id,
    name: raw.name,
    stage: raw.stage,
    status: raw.status,
    startedAt: raw.started_at,
    finishedAt: raw.finished_at,
    duration: raw.duration,
    webUrl: raw.web_url,
  };
}

// ---------------------------------------------------------------------------
// Search mappers
// ---------------------------------------------------------------------------

export function mapBlobSearchResult(raw: GitlabRawBlobSearchResult): GitlabBlobSearchResult {
  return {
    projectId: raw.project_id,
    path: raw.path,
    filename: raw.filename,
    ref: raw.ref,
    startLine: raw.startline,
    snippet: raw.data,
  };
}

export function mapCommitComment(raw: GitlabRawCommitComment): GitlabCommitComment {
  return {
    note: raw.note,
    path: raw.path ?? null,
    line: raw.line ?? null,
    lineType: raw.line_type ?? null,
    author: raw.author.username,
  };
}
