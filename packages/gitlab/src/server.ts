import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runStdioServer } from "@cuongph.dev/mcp-core";
import pkg from "../package.json" with { type: "json" };
import { config } from "./config.js";
import { handleGetCurrentUser, getCurrentUserSchema } from "./tools/get-current-user.js";
import { handleListProjects, listProjectsSchema } from "./tools/list-projects.js";
import { handleGetProject, getProjectSchema } from "./tools/get-project.js";
import { handleSearch, searchSchema } from "./tools/search.js";
import { handleListIssues, listIssuesSchema } from "./tools/list-issues.js";
import { handleGetIssue, getIssueSchema } from "./tools/get-issue.js";
import { handleListMergeRequests, listMergeRequestsSchema } from "./tools/list-merge-requests.js";
import { handleGetMergeRequest, getMergeRequestSchema } from "./tools/get-merge-request.js";
import { handleListCommits, listCommitsSchema } from "./tools/list-commits.js";
import { handleGetFile, getFileSchema } from "./tools/get-file.js";
import { handleListBranches, listBranchesSchema } from "./tools/list-branches.js";
import { handleListPipelines, listPipelinesSchema } from "./tools/list-pipelines.js";
import { handleGetPipeline, getPipelineSchema } from "./tools/get-pipeline.js";
import { handleCreateIssue, createIssueSchema } from "./tools/create-issue.js";
import { handleAddIssueNote, addIssueNoteSchema } from "./tools/add-issue-note.js";
import {
  handleAddMergeRequestNote,
  addMergeRequestNoteSchema,
} from "./tools/add-merge-request-note.js";
import {
  handleCreateMergeRequest,
  createMergeRequestSchema,
} from "./tools/create-merge-request.js";
import {
  handleUpdateMergeRequest,
  updateMergeRequestSchema,
} from "./tools/update-merge-request.js";
import {
  handleMergeMergeRequest,
  mergeMergeRequestSchema,
} from "./tools/merge-merge-request.js";
import { handleUpdateIssue, updateIssueSchema } from "./tools/update-issue.js";
import {
  handleAddCommitComment,
  addCommitCommentSchema,
} from "./tools/add-commit-comment.js";
import {
  handleReplyToDiscussion,
  replyToDiscussionSchema,
} from "./tools/reply-to-discussion.js";
import { handleCreateBranch, createBranchSchema } from "./tools/create-branch.js";
import { handleCommitFile, commitFileSchema } from "./tools/commit-file.js";
import { handleDeleteBranch, deleteBranchSchema } from "./tools/delete-branch.js";

// ---------------------------------------------------------------------------
// Tool confirmation instructions (appended to write tool descriptions)
// ---------------------------------------------------------------------------

/** Append to tools that create or modify data (issues, notes, etc.) */
const WRITE_CONFIRMATION = `

⚠️ WRITE ACTION: Before calling this tool, you MUST:
1. Show the user exactly what will be written/changed (preview the content).
2. Get explicit user approval (e.g. "yes", "go ahead", "confirm").
3. Do NOT call this tool until the user confirms.`;

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

function registerTools(server: McpServer): void {
  // ── Tool: gitlab_get_current_user ─────────────────────────────────────────
  server.tool(
    "gitlab_get_current_user",
    `Validate the configured GITLAB_TOKEN and return the authenticated GitLab user.
Also serves as a connectivity check; reports the GitLab instance version when the token allows it.`,
    getCurrentUserSchema.shape,
    async (input) => handleGetCurrentUser(input, config)
  );

  // ── Tool: gitlab_list_projects ────────────────────────────────────────────
  server.tool(
    "gitlab_list_projects",
    `List GitLab projects visible to the authenticated user.

Defaults to projects you are a member of (membership: true). Set membership: false with a
search term to discover projects you don't yet have access to.`,
    listProjectsSchema.shape,
    async (input) => handleListProjects(input, config)
  );

  // ── Tool: gitlab_get_project ───────────────────────────────────────────────
  server.tool(
    "gitlab_get_project",
    `Fetch details for a single GitLab project by numeric ID or "namespace/project" path.`,
    getProjectSchema.shape,
    async (input) => handleGetProject(input, config)
  );

  // ── Tool: gitlab_search ────────────────────────────────────────────────────
  server.tool(
    "gitlab_search",
    `Search GitLab for projects, issues, merge requests, code (blobs), or commits.

Instance-wide by default; pass projectId to scope the search to one project.`,
    searchSchema.shape,
    async (input) => handleSearch(input, config)
  );

  // ── Tool: gitlab_list_issues ───────────────────────────────────────────────
  server.tool(
    "gitlab_list_issues",
    `List GitLab issues, either for one project or assigned to the authenticated user
across the whole instance (when projectId is omitted).`,
    listIssuesSchema.shape,
    async (input) => handleListIssues(input, config)
  );

  // ── Tool: gitlab_get_issue ─────────────────────────────────────────────────
  server.tool(
    "gitlab_get_issue",
    `Fetch a single GitLab issue by project + iid, including its description and comments.`,
    getIssueSchema.shape,
    async (input) => handleGetIssue(input, config)
  );

  // ── Tool: gitlab_list_merge_requests ───────────────────────────────────────
  server.tool(
    "gitlab_list_merge_requests",
    `List GitLab merge requests, either for one project or assigned to the authenticated user
across the whole instance (when projectId is omitted).`,
    listMergeRequestsSchema.shape,
    async (input) => handleListMergeRequests(input, config)
  );

  // ── Tool: gitlab_get_merge_request ─────────────────────────────────────────
  server.tool(
    "gitlab_get_merge_request",
    `Fetch a single GitLab merge request by project + iid: description, review discussions,
and a compact changed-files summary (paths + added/removed line counts — no full diff).`,
    getMergeRequestSchema.shape,
    async (input) => handleGetMergeRequest(input, config)
  );

  // ── Tool: gitlab_list_commits ───────────────────────────────────────────────
  server.tool(
    "gitlab_list_commits",
    `List commits on a project ref (branch/tag/SHA), optionally filtered by date range.`,
    listCommitsSchema.shape,
    async (input) => handleListCommits(input, config)
  );

  // ── Tool: gitlab_get_file ───────────────────────────────────────────────────
  server.tool(
    "gitlab_get_file",
    `Fetch a repository file's content at a given ref.

Text files up to ~50KB are embedded inline. Binary files and larger text files
are reported as metadata only (path, size) — never embedded, to avoid token cost.`,
    getFileSchema.shape,
    async (input) => handleGetFile(input, config)
  );

  // ── Tool: gitlab_list_branches ──────────────────────────────────────────────
  server.tool(
    "gitlab_list_branches",
    `List branches in a project's repository, optionally filtered by name substring.`,
    listBranchesSchema.shape,
    async (input) => handleListBranches(input, config)
  );

  // ── Tool: gitlab_list_pipelines ─────────────────────────────────────────────
  server.tool(
    "gitlab_list_pipelines",
    `List CI/CD pipelines for a project, optionally filtered by ref or status.`,
    listPipelinesSchema.shape,
    async (input) => handleListPipelines(input, config)
  );

  // ── Tool: gitlab_get_pipeline ────────────────────────────────────────────────
  server.tool(
    "gitlab_get_pipeline",
    `Fetch a single CI/CD pipeline by numeric ID, including its jobs (stage, status, duration).`,
    getPipelineSchema.shape,
    async (input) => handleGetPipeline(input, config)
  );

  // ── Tool: gitlab_create_issue (write) ───────────────────────────────────────
  server.tool(
    "gitlab_create_issue",
    `Create a new GitLab issue in a project.${WRITE_CONFIRMATION}`,
    createIssueSchema.shape,
    async (input) => handleCreateIssue(input, config)
  );

  // ── Tool: gitlab_add_issue_note (write) ─────────────────────────────────────
  server.tool(
    "gitlab_add_issue_note",
    `Add a note (comment) to a GitLab issue.${WRITE_CONFIRMATION}`,
    addIssueNoteSchema.shape,
    async (input) => handleAddIssueNote(input, config)
  );

  // ── Tool: gitlab_add_merge_request_note (write) ─────────────────────────────
  server.tool(
    "gitlab_add_merge_request_note",
    `Add a note (comment) to a GitLab merge request.${WRITE_CONFIRMATION}`,
    addMergeRequestNoteSchema.shape,
    async (input) => handleAddMergeRequestNote(input, config)
  );

  // ── Tool: gitlab_create_merge_request (write) ───────────────────────────────
  server.tool(
    "gitlab_create_merge_request",
    `Create a new GitLab merge request in a project.${WRITE_CONFIRMATION}`,
    createMergeRequestSchema.shape,
    async (input) => handleCreateMergeRequest(input, config)
  );

  // ── Tool: gitlab_update_merge_request (write) ───────────────────────────────
  server.tool(
    "gitlab_update_merge_request",
    `Update a GitLab merge request's title, description, target branch, labels, assignees, or open/closed state.${WRITE_CONFIRMATION}`,
    updateMergeRequestSchema.shape,
    async (input) => handleUpdateMergeRequest(input, config)
  );

  // ── Tool: gitlab_merge_merge_request (write) ────────────────────────────────
  server.tool(
    "gitlab_merge_merge_request",
    `Merge a GitLab merge request.${WRITE_CONFIRMATION}`,
    mergeMergeRequestSchema.shape,
    async (input) => handleMergeMergeRequest(input, config)
  );

  // ── Tool: gitlab_update_issue (write) ───────────────────────────────────────
  server.tool(
    "gitlab_update_issue",
    `Update a GitLab issue's title, description, labels, assignees, or open/closed state.${WRITE_CONFIRMATION}`,
    updateIssueSchema.shape,
    async (input) => handleUpdateIssue(input, config)
  );

  // ── Tool: gitlab_add_commit_comment (write) ─────────────────────────────────
  server.tool(
    "gitlab_add_commit_comment",
    `Add a comment to a GitLab commit, optionally anchored to a specific file/line.${WRITE_CONFIRMATION}`,
    addCommitCommentSchema.shape,
    async (input) => handleAddCommitComment(input, config)
  );

  // ── Tool: gitlab_reply_to_discussion (write) ────────────────────────────────
  server.tool(
    "gitlab_reply_to_discussion",
    `Reply to an existing discussion thread on a GitLab issue or merge request.${WRITE_CONFIRMATION}`,
    replyToDiscussionSchema.shape,
    async (input) => handleReplyToDiscussion(input, config)
  );

  // ── Tool: gitlab_create_branch (write) ──────────────────────────────────────
  server.tool(
    "gitlab_create_branch",
    `Create a new branch in a GitLab project's repository.${WRITE_CONFIRMATION}`,
    createBranchSchema.shape,
    async (input) => handleCreateBranch(input, config)
  );

  // ── Tool: gitlab_commit_file (write) ────────────────────────────────────────
  server.tool(
    "gitlab_commit_file",
    `Create, update, or delete a single repository file via a direct commit to a branch.${WRITE_CONFIRMATION}`,
    commitFileSchema.shape,
    async (input) => handleCommitFile(input, config)
  );

  // ── Tool: gitlab_delete_branch (write) ──────────────────────────────────────
  server.tool(
    "gitlab_delete_branch",
    `Delete a branch from a GitLab project's repository.${WRITE_CONFIRMATION}`,
    deleteBranchSchema.shape,
    async (input) => handleDeleteBranch(input, config)
  );
}

runStdioServer({
  name: "gitlab-mcp",
  version: pkg.version,
  register: (server) => registerTools(server),
}).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[gitlab-mcp] Fatal error: ${msg}\n`);
  process.exit(1);
});
