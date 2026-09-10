import { createHttpClient } from "@cuongph.dev/mcp-core";
import type { AxiosInstance, AxiosResponse } from "axios";
import {
  encodeProjectId,
  versionUrl,
  projectsUrl,
  projectUrl,
  searchUrl,
  projectSearchUrl,
  issuesUrl,
  projectIssuesUrl,
  projectIssueUrl,
  projectIssueNotesUrl,
  mergeRequestsUrl,
  projectMergeRequestsUrl,
  projectMergeRequestUrl,
  projectMergeRequestNotesUrl,
  projectMergeRequestDiscussionsUrl,
  projectMergeRequestChangesUrl,
  projectMergeRequestMergeUrl,
  projectCommitsUrl,
  projectCommitCommentsUrl,
  projectDiscussionNotesUrl,
  projectFileUrl,
  projectBranchesUrl,
  projectBranchUrl,
  projectPipelinesUrl,
  projectPipelineUrl,
  projectPipelineJobsUrl,
} from "./endpoints.js";
import {
  mapUser,
  mapCurrentUser,
  mapProject,
  mapIssueSummary,
  mapIssue,
  mapMergeRequestSummary,
  mapMergeRequest,
  mapNote,
  mapDiscussion,
  mapCommit,
  mapBranch,
  mapPipeline,
  mapJob,
  mapMrChange,
  mapBlobSearchResult,
  mapCommitComment,
} from "./mappers.js";
import { authRequired, permissionDenied, gitlabHttpError, gitlabResponseError } from "../errors.js";
import type {
  GitlabRawUser,
  GitlabRawVersion,
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
  GitlabRawFile,
  GitlabRawBlobSearchResult,
  GitlabRawCommitComment,
} from "../types/gitlab-api.js";
import type {
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
  GitlabFile,
  GitlabBlobSearchResult,
  GitlabCommitComment,
} from "../types.js";
import type { PageMeta } from "../utils.js";

// ---------------------------------------------------------------------------
// Shared param shapes
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

/** Maximum inline file size before content is reported as metadata only. */
export const MAX_FILE_SIZE = 50_000;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class GitlabHttpClient {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.http = createHttpClient({
      baseURL: `${this.baseUrl}/api/v4`,
      headers: { "PRIVATE-TOKEN": token, Accept: "application/json" },
    });
  }

  // ---------------------------------------------------------------------------
  // gitlab_get_current_user
  // ---------------------------------------------------------------------------

  /**
   * `validatePath` is the REST path used to validate the token, e.g.
   * `/api/v4/user` (configurable via `GITLAB_VALIDATE_PATH` for self-hosted
   * setups behind a reverse proxy that remaps the API path).
   */
  async getCurrentUser(validatePath: string): Promise<GitlabCurrentUser> {
    const url = `${this.baseUrl}${validatePath}`;
    const res = await this.http.get(url);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapCurrentUser(res.data as GitlabRawUser);
  }

  /**
   * Best-effort GitLab version lookup. Never throws — returns null if the
   * endpoint is unavailable or the token lacks permission for it, so it
   * never blocks gitlab_get_current_user's primary auth-validation purpose.
   */
  async tryGetVersion(): Promise<GitlabRawVersion | null> {
    try {
      const res = await this.http.get(versionUrl(this.baseUrl));
      if (res.status !== 200) return null;
      const body = res.data as GitlabRawVersion;
      if (!body || typeof body.version !== "string") return null;
      return body;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // gitlab_list_projects / gitlab_get_project
  // ---------------------------------------------------------------------------

  async listProjects(
    params: PaginationParams & { search?: string; membership?: boolean; orderBy?: string }
  ): Promise<Page<GitlabProject>> {
    const url = projectsUrl(this.baseUrl);
    const query: Record<string, unknown> = { ...toPageQuery(params) };
    if (params.search) query.search = params.search;
    if (params.membership != null) query.membership = params.membership;
    if (params.orderBy) query.order_by = params.orderBy;

    const res = await this.http.get(url, { params: query });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET /projects", res.data);
    }
    return { items: (res.data as GitlabRawProject[]).map(mapProject), meta: extractPageMeta(res, params) };
  }

  async getProject(projectIdOrPath: string): Promise<GitlabProject> {
    const url = projectUrl(this.baseUrl, projectIdOrPath);
    const res = await this.http.get(url);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapProject(res.data as GitlabRawProject);
  }

  // ---------------------------------------------------------------------------
  // gitlab_search
  // ---------------------------------------------------------------------------

  async search(params: {
    scope: "projects" | "issues" | "merge_requests" | "blobs" | "commits";
    search: string;
    projectId?: string;
  }): Promise<{
    projects?: GitlabProject[];
    issues?: GitlabIssueSummary[];
    mergeRequests?: GitlabMergeRequestSummary[];
    commits?: GitlabCommit[];
    blobs?: GitlabBlobSearchResult[];
  }> {
    const url = params.projectId
      ? projectSearchUrl(this.baseUrl, params.projectId)
      : searchUrl(this.baseUrl);
    const res = await this.http.get(url, { params: { scope: params.scope, search: params.search } });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET /search", res.data);
    }

    switch (params.scope) {
      case "projects":
        return { projects: (res.data as GitlabRawProject[]).map(mapProject) };
      case "issues":
        return { issues: (res.data as GitlabRawIssue[]).map(mapIssueSummary) };
      case "merge_requests":
        return { mergeRequests: (res.data as GitlabRawMergeRequest[]).map(mapMergeRequestSummary) };
      case "commits":
        return { commits: (res.data as GitlabRawCommit[]).map(mapCommit) };
      case "blobs":
        return { blobs: (res.data as GitlabRawBlobSearchResult[]).map(mapBlobSearchResult) };
    }
  }

  // ---------------------------------------------------------------------------
  // gitlab_list_issues / gitlab_get_issue
  // ---------------------------------------------------------------------------

  async listIssues(
    params: PaginationParams & {
      projectId?: string;
      state?: "opened" | "closed" | "all";
      labels?: string;
      search?: string;
      scope?: "created_by_me" | "assigned_to_me" | "all";
    }
  ): Promise<Page<GitlabIssueSummary>> {
    const url = params.projectId
      ? projectIssuesUrl(this.baseUrl, params.projectId)
      : issuesUrl(this.baseUrl);
    const query: Record<string, unknown> = { ...toPageQuery(params) };
    if (params.state) query.state = params.state;
    if (params.labels) query.labels = params.labels;
    if (params.search) query.search = params.search;
    // GitLab's global /issues endpoint defaults to scope=created_by_me;
    // callers without a projectId almost always want their assigned work.
    query.scope = params.scope ?? (params.projectId ? undefined : "assigned_to_me");

    const res = await this.http.get(url, { params: query });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET /issues", res.data);
    }
    return { items: (res.data as GitlabRawIssue[]).map(mapIssueSummary), meta: extractPageMeta(res, params) };
  }

  async getIssue(projectIdOrPath: string, issueIid: number): Promise<GitlabIssue> {
    const url = projectIssueUrl(this.baseUrl, projectIdOrPath, issueIid);
    const res = await this.http.get(url);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapIssue(res.data as GitlabRawIssue);
  }

  /** Top-level notes for an issue, oldest first, capped at `perPage`. */
  async getIssueNotes(
    projectIdOrPath: string,
    issueIid: number,
    perPage = 20
  ): Promise<Page<GitlabNote>> {
    const url = projectIssueNotesUrl(this.baseUrl, projectIdOrPath, issueIid);
    const res = await this.http.get(url, {
      params: { order_by: "created_at", sort: "asc", per_page: perPage, page: 1 },
    });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET issue notes", res.data);
    }
    return {
      items: (res.data as GitlabRawNote[]).map(mapNote),
      meta: extractPageMeta(res, { page: 1, perPage }),
    };
  }

  // ---------------------------------------------------------------------------
  // gitlab_create_issue / gitlab_add_issue_note
  // ---------------------------------------------------------------------------

  async createIssue(
    projectIdOrPath: string,
    params: { title: string; description?: string; labels?: string[]; assigneeIds?: number[] }
  ): Promise<GitlabIssue> {
    const url = projectIssuesUrl(this.baseUrl, projectIdOrPath);
    const body: Record<string, unknown> = { title: params.title };
    if (params.description != null) body.description = params.description;
    if (params.labels && params.labels.length > 0) body.labels = params.labels.join(",");
    if (params.assigneeIds && params.assigneeIds.length > 0) body.assignee_ids = params.assigneeIds;

    const res = await this.http.post(url, body);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapIssue(res.data as GitlabRawIssue);
  }

  async addIssueNote(projectIdOrPath: string, issueIid: number, body: string): Promise<GitlabNote> {
    const url = projectIssueNotesUrl(this.baseUrl, projectIdOrPath, issueIid);
    const res = await this.http.post(url, { body });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapNote(res.data as GitlabRawNote);
  }

  // ---------------------------------------------------------------------------
  // gitlab_list_merge_requests / gitlab_get_merge_request
  // ---------------------------------------------------------------------------

  async listMergeRequests(
    params: PaginationParams & {
      projectId?: string;
      state?: "opened" | "closed" | "merged" | "all";
      search?: string;
      scope?: "created_by_me" | "assigned_to_me" | "all";
    }
  ): Promise<Page<GitlabMergeRequestSummary>> {
    const url = params.projectId
      ? projectMergeRequestsUrl(this.baseUrl, params.projectId)
      : mergeRequestsUrl(this.baseUrl);
    const query: Record<string, unknown> = { ...toPageQuery(params) };
    if (params.state) query.state = params.state;
    if (params.search) query.search = params.search;
    query.scope = params.scope ?? (params.projectId ? undefined : "assigned_to_me");

    const res = await this.http.get(url, { params: query });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET /merge_requests", res.data);
    }
    return {
      items: (res.data as GitlabRawMergeRequest[]).map(mapMergeRequestSummary),
      meta: extractPageMeta(res, params),
    };
  }

  async getMergeRequest(projectIdOrPath: string, mrIid: number): Promise<GitlabMergeRequest> {
    const url = projectMergeRequestUrl(this.baseUrl, projectIdOrPath, mrIid);
    const res = await this.http.get(url);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapMergeRequest(res.data as GitlabRawMergeRequest);
  }

  /** Top-level discussions (review threads) for a merge request, capped at `perPage`. */
  async getMergeRequestDiscussions(
    projectIdOrPath: string,
    mrIid: number,
    perPage = 20
  ): Promise<Page<GitlabDiscussion>> {
    const url = projectMergeRequestDiscussionsUrl(this.baseUrl, projectIdOrPath, mrIid);
    const res = await this.http.get(url, { params: { per_page: perPage, page: 1 } });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET merge request discussions", res.data);
    }
    return {
      items: (res.data as GitlabRawDiscussion[]).map(mapDiscussion),
      meta: extractPageMeta(res, { page: 1, perPage }),
    };
  }

  /** Compact changed-files summary (path + added/removed line counts, no full diff). */
  async getMergeRequestChanges(projectIdOrPath: string, mrIid: number): Promise<GitlabMrChangeSummary[]> {
    const url = projectMergeRequestChangesUrl(this.baseUrl, projectIdOrPath, mrIid);
    const res = await this.http.get(url);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    const body = res.data as { changes?: GitlabRawMrChange[] };
    if (!body || !Array.isArray(body.changes)) {
      throw gitlabResponseError("Expected `changes` array from GET merge request changes", res.data);
    }
    return body.changes.map(mapMrChange);
  }

  /** Adds a note (comment) to a merge request; does not resolve a discussion thread. */
  async addMergeRequestNote(projectIdOrPath: string, mrIid: number, body: string): Promise<GitlabNote> {
    const url = projectMergeRequestNotesUrl(this.baseUrl, projectIdOrPath, mrIid);
    const res = await this.http.post(url, { body });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapNote(res.data as GitlabRawNote);
  }

  // ---------------------------------------------------------------------------
  // gitlab_list_commits
  // ---------------------------------------------------------------------------

  async listCommits(
    projectIdOrPath: string,
    params: PaginationParams & { ref?: string; since?: string; until?: string }
  ): Promise<Page<GitlabCommit>> {
    const url = projectCommitsUrl(this.baseUrl, projectIdOrPath);
    const query: Record<string, unknown> = { ...toPageQuery(params) };
    if (params.ref) query.ref_name = params.ref;
    if (params.since) query.since = params.since;
    if (params.until) query.until = params.until;

    const res = await this.http.get(url, { params: query });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET repository commits", res.data);
    }
    return { items: (res.data as GitlabRawCommit[]).map(mapCommit), meta: extractPageMeta(res, params) };
  }

  // ---------------------------------------------------------------------------
  // gitlab_get_file
  // ---------------------------------------------------------------------------

  async getFile(projectIdOrPath: string, filePath: string, ref: string): Promise<GitlabFile> {
    const url = projectFileUrl(this.baseUrl, projectIdOrPath, filePath);
    const res = await this.http.get(url, { params: { ref } });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);

    const raw = res.data as GitlabRawFile;
    if (!raw || typeof raw.content !== "string") {
      throw gitlabResponseError("Unexpected repository file response shape", res.data);
    }

    const decoded = Buffer.from(raw.content, raw.encoding === "base64" ? "base64" : "utf-8");
    const isBinary = !isTextContent(decoded);
    const tooLarge = raw.size > MAX_FILE_SIZE;

    return {
      filePath: raw.file_path,
      ref: raw.ref,
      size: raw.size,
      binary: isBinary,
      truncated: tooLarge && !isBinary,
      content: isBinary || tooLarge ? null : decoded.toString("utf-8"),
    };
  }

  // ---------------------------------------------------------------------------
  // gitlab_list_branches
  // ---------------------------------------------------------------------------

  async listBranches(
    projectIdOrPath: string,
    params: PaginationParams & { search?: string }
  ): Promise<Page<GitlabBranch>> {
    const url = projectBranchesUrl(this.baseUrl, projectIdOrPath);
    const query: Record<string, unknown> = { ...toPageQuery(params) };
    if (params.search) query.search = params.search;

    const res = await this.http.get(url, { params: query });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET repository branches", res.data);
    }
    return { items: (res.data as GitlabRawBranch[]).map(mapBranch), meta: extractPageMeta(res, params) };
  }

  // ---------------------------------------------------------------------------
  // gitlab_list_pipelines / gitlab_get_pipeline
  // ---------------------------------------------------------------------------

  async listPipelines(
    projectIdOrPath: string,
    params: PaginationParams & { ref?: string; status?: string }
  ): Promise<Page<GitlabPipeline>> {
    const url = projectPipelinesUrl(this.baseUrl, projectIdOrPath);
    const query: Record<string, unknown> = { ...toPageQuery(params) };
    if (params.ref) query.ref = params.ref;
    if (params.status) query.status = params.status;

    const res = await this.http.get(url, { params: query });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET pipelines", res.data);
    }
    return { items: (res.data as GitlabRawPipeline[]).map(mapPipeline), meta: extractPageMeta(res, params) };
  }

  async getPipeline(projectIdOrPath: string, pipelineId: number): Promise<GitlabPipeline> {
    const url = projectPipelineUrl(this.baseUrl, projectIdOrPath, pipelineId);
    const res = await this.http.get(url);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapPipeline(res.data as GitlabRawPipeline);
  }

  async getPipelineJobs(projectIdOrPath: string, pipelineId: number): Promise<GitlabJob[]> {
    const url = projectPipelineJobsUrl(this.baseUrl, projectIdOrPath, pipelineId);
    const res = await this.http.get(url, { params: { per_page: 100 } });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    if (!Array.isArray(res.data)) {
      throw gitlabResponseError("Expected array response from GET pipeline jobs", res.data);
    }
    return (res.data as GitlabRawJob[]).map(mapJob);
  }

  // ---------------------------------------------------------------------------
  // gitlab_create_merge_request / gitlab_update_merge_request / gitlab_merge_merge_request
  // ---------------------------------------------------------------------------

  async createMergeRequest(
    projectIdOrPath: string,
    params: {
      sourceBranch: string;
      targetBranch: string;
      title: string;
      description?: string;
      assigneeIds?: number[];
      reviewerIds?: number[];
      labels?: string[];
      removeSourceBranch?: boolean;
      squash?: boolean;
    }
  ): Promise<GitlabMergeRequest> {
    const url = projectMergeRequestsUrl(this.baseUrl, projectIdOrPath);
    const body: Record<string, unknown> = {
      source_branch: params.sourceBranch,
      target_branch: params.targetBranch,
      title: params.title,
    };
    if (params.description != null) body.description = params.description;
    if (params.assigneeIds && params.assigneeIds.length > 0) body.assignee_ids = params.assigneeIds;
    if (params.reviewerIds && params.reviewerIds.length > 0) body.reviewer_ids = params.reviewerIds;
    if (params.labels && params.labels.length > 0) body.labels = params.labels.join(",");
    if (params.removeSourceBranch != null) body.remove_source_branch = params.removeSourceBranch;
    if (params.squash != null) body.squash = params.squash;

    const res = await this.http.post(url, body);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapMergeRequest(res.data as GitlabRawMergeRequest);
  }

  async updateMergeRequest(
    projectIdOrPath: string,
    mrIid: number,
    params: {
      title?: string;
      description?: string;
      targetBranch?: string;
      stateEvent?: "close" | "reopen";
      labels?: string[];
      addLabels?: string[];
      removeLabels?: string[];
      assigneeIds?: number[];
    }
  ): Promise<GitlabMergeRequest> {
    const url = projectMergeRequestUrl(this.baseUrl, projectIdOrPath, mrIid);
    const body: Record<string, unknown> = {};
    if (params.title != null) body.title = params.title;
    if (params.description != null) body.description = params.description;
    if (params.targetBranch != null) body.target_branch = params.targetBranch;
    if (params.stateEvent != null) body.state_event = params.stateEvent;
    if (params.labels && params.labels.length > 0) body.labels = params.labels.join(",");
    if (params.addLabels && params.addLabels.length > 0) body.add_labels = params.addLabels.join(",");
    if (params.removeLabels && params.removeLabels.length > 0) body.remove_labels = params.removeLabels.join(",");
    if (params.assigneeIds && params.assigneeIds.length > 0) body.assignee_ids = params.assigneeIds;

    const res = await this.http.put(url, body);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapMergeRequest(res.data as GitlabRawMergeRequest);
  }

  async mergeMergeRequest(
    projectIdOrPath: string,
    mrIid: number,
    params: {
      mergeCommitMessage?: string;
      squash?: boolean;
      shouldRemoveSourceBranch?: boolean;
      mergeWhenPipelineSucceeds?: boolean;
      sha?: string;
    }
  ): Promise<GitlabMergeRequest> {
    const url = projectMergeRequestMergeUrl(this.baseUrl, projectIdOrPath, mrIid);
    const body: Record<string, unknown> = {};
    if (params.mergeCommitMessage != null) body.merge_commit_message = params.mergeCommitMessage;
    if (params.squash != null) body.squash = params.squash;
    if (params.shouldRemoveSourceBranch != null) {
      body.should_remove_source_branch = params.shouldRemoveSourceBranch;
    }
    if (params.mergeWhenPipelineSucceeds != null) {
      body.merge_when_pipeline_succeeds = params.mergeWhenPipelineSucceeds;
    }
    if (params.sha != null) body.sha = params.sha;

    const res = await this.http.put(url, body);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapMergeRequest(res.data as GitlabRawMergeRequest);
  }

  // ---------------------------------------------------------------------------
  // gitlab_update_issue
  // ---------------------------------------------------------------------------

  async updateIssue(
    projectIdOrPath: string,
    issueIid: number,
    params: {
      title?: string;
      description?: string;
      stateEvent?: "close" | "reopen";
      labels?: string[];
      addLabels?: string[];
      removeLabels?: string[];
      assigneeIds?: number[];
    }
  ): Promise<GitlabIssue> {
    const url = projectIssueUrl(this.baseUrl, projectIdOrPath, issueIid);
    const body: Record<string, unknown> = {};
    if (params.title != null) body.title = params.title;
    if (params.description != null) body.description = params.description;
    if (params.stateEvent != null) body.state_event = params.stateEvent;
    if (params.labels && params.labels.length > 0) body.labels = params.labels.join(",");
    if (params.addLabels && params.addLabels.length > 0) body.add_labels = params.addLabels.join(",");
    if (params.removeLabels && params.removeLabels.length > 0) body.remove_labels = params.removeLabels.join(",");
    if (params.assigneeIds && params.assigneeIds.length > 0) body.assignee_ids = params.assigneeIds;

    const res = await this.http.put(url, body);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapIssue(res.data as GitlabRawIssue);
  }

  // ---------------------------------------------------------------------------
  // gitlab_add_commit_comment / gitlab_reply_to_discussion
  // ---------------------------------------------------------------------------

  async addCommitComment(
    projectIdOrPath: string,
    sha: string,
    params: { note: string; path?: string; line?: number; lineType?: "new" | "old" }
  ): Promise<GitlabCommitComment> {
    const url = projectCommitCommentsUrl(this.baseUrl, projectIdOrPath, sha);
    const body: Record<string, unknown> = { note: params.note };
    if (params.path != null) body.path = params.path;
    if (params.line != null) body.line = params.line;
    if (params.lineType != null) body.line_type = params.lineType;

    const res = await this.http.post(url, body);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapCommitComment(res.data as GitlabRawCommitComment);
  }

  /** Replies to an existing discussion thread on an issue or merge request. */
  async replyToDiscussion(
    projectIdOrPath: string,
    noteableType: "issue" | "merge_request",
    iid: number,
    discussionId: string,
    body: string
  ): Promise<GitlabNote> {
    const resource = noteableType === "issue" ? "issues" : "merge_requests";
    const url = projectDiscussionNotesUrl(this.baseUrl, projectIdOrPath, resource, iid, discussionId);
    const res = await this.http.post(url, { body });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapNote(res.data as GitlabRawNote);
  }

  // ---------------------------------------------------------------------------
  // gitlab_create_branch / gitlab_commit_file / gitlab_delete_branch
  // ---------------------------------------------------------------------------

  async createBranch(projectIdOrPath: string, branch: string, ref: string): Promise<GitlabBranch> {
    const url = projectBranchesUrl(this.baseUrl, projectIdOrPath);
    const res = await this.http.post(url, null, { params: { branch, ref } });
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapBranch(res.data as GitlabRawBranch);
  }

  /** Commits a single file change (create/update/delete) directly to a branch. */
  async commitFile(
    projectIdOrPath: string,
    params: {
      branch: string;
      commitMessage: string;
      action: "create" | "update" | "delete";
      filePath: string;
      content?: string;
      encoding?: "text" | "base64";
      startBranch?: string;
    }
  ): Promise<GitlabCommit> {
    const url = projectCommitsUrl(this.baseUrl, projectIdOrPath);
    const action: Record<string, unknown> = { action: params.action, file_path: params.filePath };
    if (params.action !== "delete" && params.content != null) action.content = params.content;
    if (params.encoding != null) action.encoding = params.encoding;

    const body: Record<string, unknown> = {
      branch: params.branch,
      commit_message: params.commitMessage,
      actions: [action],
    };
    if (params.startBranch != null) body.start_branch = params.startBranch;

    const res = await this.http.post(url, body);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
    return mapCommit(res.data as GitlabRawCommit);
  }

  async deleteBranch(projectIdOrPath: string, branch: string): Promise<void> {
    const url = projectBranchUrl(this.baseUrl, projectIdOrPath, branch);
    const res = await this.http.delete(url);
    this.checkForAuthFailure(res.status, url);
    this.assertOk(res.status, url, res.data);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private checkForAuthFailure(status: number, url: string): void {
    if (status === 401) throw authRequired();
    if (status === 403) throw permissionDenied(url);
  }

  private assertOk(status: number, url: string, body: unknown): void {
    if (status < 200 || status >= 300) {
      let detail: string | undefined;
      if (body && typeof body === "object") {
        const b = body as { message?: unknown; error?: unknown };
        if (typeof b.message === "string") detail = b.message;
        else if (b.message != null) detail = JSON.stringify(b.message);
        else if (typeof b.error === "string") detail = b.error;
      }
      throw gitlabHttpError(status, url, detail ?? (typeof body === "string" ? body : undefined));
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

function toPageQuery(params: PaginationParams): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (params.page != null) query.page = params.page;
  if (params.perPage != null) query.per_page = params.perPage;
  return query;
}

/**
 * Reads GitLab's `X-Total`/`X-Total-Pages`/`X-Page`/`X-Per-Page` pagination
 * headers when present (GitLab omits them when a request opts out of
 * counting, e.g. large collections), falling back to the requested params.
 */
function extractPageMeta(res: AxiosResponse, params: PaginationParams): PageMeta {
  const headers = res.headers as Record<string, string | undefined>;
  const page = Number(headers["x-page"]) || params.page || 1;
  const perPage = Number(headers["x-per-page"]) || params.perPage || 20;
  const total = headers["x-total"] != null ? Number(headers["x-total"]) : undefined;
  const totalPages = headers["x-total-pages"] != null ? Number(headers["x-total-pages"]) : undefined;
  return { page, perPage, total, totalPages };
}

/** Fraction of control bytes (excluding tab/LF/CR) above which content is treated as binary. */
const CONTROL_BYTE_RATIO_LIMIT = 0.003;

/**
 * Heuristic for whether decoded file bytes are safe to inline as text.
 * All three must hold: no NUL byte, valid UTF-8, and a low ratio of
 * non-printable control bytes. Anything else is reported as binary
 * metadata-only — it is never inlined or base64-embedded in tool output.
 */
function isTextContent(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  if (buffer.includes(0)) return false;

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return false;
  }

  let controlBytes = 0;
  for (const byte of buffer) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) continue; // \t \n \r
    if (byte < 0x09 || (byte >= 0x0e && byte <= 0x1f)) controlBytes++;
  }
  return controlBytes / buffer.length < CONTROL_BYTE_RATIO_LIMIT;
}
