import { createHttpClient } from "@cuongph.dev/mcp-core";
import type { AxiosInstance, AxiosResponse } from "axios";
import {
  encodeProjectId,
  userUrl,
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
  projectMergeRequestDiscussionsUrl,
  projectMergeRequestChangesUrl,
  projectCommitsUrl,
  projectFileUrl,
  projectBranchesUrl,
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

  async getCurrentUser(): Promise<GitlabCurrentUser> {
    const url = userUrl(this.baseUrl);
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
    const isBinary = decoded.subarray(0, 8000).includes(0);
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
