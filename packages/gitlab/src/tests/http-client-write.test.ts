import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  GitlabRawIssue,
  GitlabRawNote,
  GitlabRawUser,
  GitlabRawMergeRequest,
  GitlabRawCommit,
  GitlabRawBranch,
} from "../types/gitlab-api.js";

// ---------------------------------------------------------------------------
// Mocks — stub `createHttpClient` so `GitlabHttpClient` never touches real
// axios/network; capture the args passed to `post`/`put`/`delete` per test.
// ---------------------------------------------------------------------------
const { mockPost, mockPut, mockDelete, mockCreateHttpClient } = vi.hoisted(() => {
  const post = vi.fn();
  const put = vi.fn();
  const del = vi.fn();
  return {
    mockPost: post,
    mockPut: put,
    mockDelete: del,
    mockCreateHttpClient: vi.fn(() => ({ get: vi.fn(), post, put, delete: del })),
  };
});

vi.mock("@cuongph.dev/mcp-core", async () => {
  const actual = await vi.importActual<typeof import("@cuongph.dev/mcp-core")>("@cuongph.dev/mcp-core");
  return { ...actual, createHttpClient: mockCreateHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const BASE_URL = "https://devops.runsystem.info";
const TOKEN = "test-token";

function rawUser(): GitlabRawUser {
  return {
    id: 1,
    username: "alice",
    name: "Alice",
    state: "active",
    avatar_url: null,
    web_url: `${BASE_URL}/alice`,
    email: "alice@example.com",
  };
}

function rawIssue(overrides: Partial<GitlabRawIssue> = {}): GitlabRawIssue {
  return {
    id: 100,
    iid: 42,
    project_id: 7,
    title: "New bug",
    description: "Steps to reproduce",
    state: "opened",
    labels: ["bug"],
    milestone: null,
    assignees: [],
    author: rawUser(),
    web_url: `${BASE_URL}/mygroup/myproject/-/issues/42`,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    closed_at: null,
    due_date: null,
    confidential: false,
    user_notes_count: 0,
    upvotes: 0,
    downvotes: 0,
    ...overrides,
  };
}

function rawNote(overrides: Partial<GitlabRawNote> = {}): GitlabRawNote {
  return {
    id: 200,
    body: "Looks good",
    author: rawUser(),
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    system: false,
    ...overrides,
  };
}

function rawMergeRequest(overrides: Partial<GitlabRawMergeRequest> = {}): GitlabRawMergeRequest {
  return {
    id: 900,
    iid: 7,
    project_id: 42,
    title: "Add feature",
    description: "Details",
    state: "opened",
    draft: false,
    merge_status: "can_be_merged",
    has_conflicts: false,
    target_branch: "main",
    source_branch: "feature/x",
    author: rawUser(),
    assignees: [],
    labels: [],
    web_url: `${BASE_URL}/mygroup/myproject/-/merge_requests/7`,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    merged_at: null,
    closed_at: null,
    sha: "abc123",
    user_notes_count: 0,
    upvotes: 0,
    downvotes: 0,
    ...overrides,
  };
}

function rawCommit(overrides: Partial<GitlabRawCommit> = {}): GitlabRawCommit {
  return {
    id: "deadbeef00000000000000000000000000000000",
    short_id: "deadbee",
    title: "Update src/index.ts",
    message: "Update src/index.ts",
    author_name: "alice",
    author_email: "alice@example.com",
    authored_date: "2026-09-01T00:00:00Z",
    committed_date: "2026-09-01T00:00:00Z",
    web_url: `${BASE_URL}/mygroup/myproject/-/commit/deadbeef`,
    ...overrides,
  };
}

function rawBranch(overrides: Partial<GitlabRawBranch> = {}): GitlabRawBranch {
  return {
    name: "feature/x",
    commit: { id: "abc1234", short_id: "abc1234", title: "Initial commit", committed_date: "2026-09-01T00:00:00Z" },
    merged: false,
    protected: false,
    default: false,
    web_url: `${BASE_URL}/mygroup/myproject/-/tree/feature/x`,
    ...overrides,
  };
}

describe("GitlabHttpClient write methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createIssue POSTs to /projects/:id/issues with title, description, labels joined, and assignee_ids", async () => {
    mockPost.mockResolvedValue({ status: 201, data: rawIssue() });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const issue = await client.createIssue("mygroup/myproject", {
      title: "New bug",
      description: "Steps to reproduce",
      labels: ["bug", "urgent"],
      assigneeIds: [1, 2],
    });

    expect(mockPost).toHaveBeenCalledWith(
      `${BASE_URL}/api/v4/projects/mygroup%2Fmyproject/issues`,
      { title: "New bug", description: "Steps to reproduce", labels: "bug,urgent", assignee_ids: [1, 2] }
    );
    expect(issue.iid).toBe(42);
    expect(issue.title).toBe("New bug");
  });

  it("createIssue omits labels/assignee_ids from the body when not provided", async () => {
    mockPost.mockResolvedValue({ status: 201, data: rawIssue() });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await client.createIssue("42", { title: "Minimal issue" });

    expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/projects/42/issues`, { title: "Minimal issue" });
  });

  it("createIssue maps a 401 response to AUTH_REQUIRED", async () => {
    mockPost.mockResolvedValue({ status: 401, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.createIssue("42", { title: "x" })).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("addIssueNote POSTs to /projects/:id/issues/:iid/notes with the body", async () => {
    mockPost.mockResolvedValue({ status: 201, data: rawNote({ body: "Confirmed" }) });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const note = await client.addIssueNote("mygroup/myproject", 42, "Confirmed");

    expect(mockPost).toHaveBeenCalledWith(
      `${BASE_URL}/api/v4/projects/mygroup%2Fmyproject/issues/42/notes`,
      { body: "Confirmed" }
    );
    expect(note.id).toBe(200);
    expect(note.body).toBe("Confirmed");
  });

  it("addIssueNote maps a 401 response to AUTH_REQUIRED", async () => {
    mockPost.mockResolvedValue({ status: 401, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.addIssueNote("42", 1, "hi")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("addMergeRequestNote POSTs to /projects/:id/merge_requests/:iid/notes with the body", async () => {
    mockPost.mockResolvedValue({ status: 201, data: rawNote({ body: "LGTM" }) });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const note = await client.addMergeRequestNote("mygroup/myproject", 7, "LGTM");

    expect(mockPost).toHaveBeenCalledWith(
      `${BASE_URL}/api/v4/projects/mygroup%2Fmyproject/merge_requests/7/notes`,
      { body: "LGTM" }
    );
    expect(note.body).toBe("LGTM");
  });

  it("addMergeRequestNote maps a 401 response to AUTH_REQUIRED", async () => {
    mockPost.mockResolvedValue({ status: 401, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.addMergeRequestNote("42", 1, "hi")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("createMergeRequest POSTs to /projects/:id/merge_requests with snake_case body fields", async () => {
    mockPost.mockResolvedValue({ status: 201, data: rawMergeRequest() });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const mr = await client.createMergeRequest("mygroup/myproject", {
      sourceBranch: "feature/x",
      targetBranch: "main",
      title: "Add feature",
      description: "Details",
      assigneeIds: [1, 2],
      reviewerIds: [3],
      labels: ["feature", "urgent"],
      removeSourceBranch: true,
      squash: true,
    });

    expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/projects/mygroup%2Fmyproject/merge_requests`, {
      source_branch: "feature/x",
      target_branch: "main",
      title: "Add feature",
      description: "Details",
      assignee_ids: [1, 2],
      reviewer_ids: [3],
      labels: "feature,urgent",
      remove_source_branch: true,
      squash: true,
    });
    expect(mr.iid).toBe(7);
    expect(mr.sourceBranch).toBe("feature/x");
  });

  it("createMergeRequest maps a 401 response to AUTH_REQUIRED", async () => {
    mockPost.mockResolvedValue({ status: 401, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(
      client.createMergeRequest("42", { sourceBranch: "a", targetBranch: "b", title: "x" })
    ).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("mergeMergeRequest PUTs to /projects/:id/merge_requests/:iid/merge with snake_case body fields", async () => {
    mockPut.mockResolvedValue({ status: 200, data: rawMergeRequest({ state: "merged", merged_at: "2026-09-02T00:00:00Z" }) });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const mr = await client.mergeMergeRequest("mygroup/myproject", 7, {
      mergeCommitMessage: "Merge feature/x",
      squash: true,
      shouldRemoveSourceBranch: true,
      mergeWhenPipelineSucceeds: false,
      sha: "abc123",
    });

    expect(mockPut).toHaveBeenCalledWith(`${BASE_URL}/api/v4/projects/mygroup%2Fmyproject/merge_requests/7/merge`, {
      merge_commit_message: "Merge feature/x",
      squash: true,
      should_remove_source_branch: true,
      merge_when_pipeline_succeeds: false,
      sha: "abc123",
    });
    expect(mr.state).toBe("merged");
  });

  it("mergeMergeRequest maps a 401 response to AUTH_REQUIRED", async () => {
    mockPut.mockResolvedValue({ status: 401, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.mergeMergeRequest("42", 7, {})).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("commitFile POSTs to /projects/:id/repository/commits with a single create/update action", async () => {
    mockPost.mockResolvedValue({ status: 201, data: rawCommit() });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const commit = await client.commitFile("mygroup/myproject", {
      branch: "main",
      commitMessage: "Update index",
      action: "update",
      filePath: "src/index.ts",
      content: "export {};",
      encoding: "text",
    });

    expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/projects/mygroup%2Fmyproject/repository/commits`, {
      branch: "main",
      commit_message: "Update index",
      actions: [{ action: "update", file_path: "src/index.ts", content: "export {};", encoding: "text" }],
    });
    expect(commit.shortId).toBe("deadbee");
  });

  it("commitFile omits content from the action when deleting a file", async () => {
    mockPost.mockResolvedValue({ status: 201, data: rawCommit() });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await client.commitFile("42", {
      branch: "main",
      commitMessage: "Remove file",
      action: "delete",
      filePath: "old.txt",
    });

    expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/projects/42/repository/commits`, {
      branch: "main",
      commit_message: "Remove file",
      actions: [{ action: "delete", file_path: "old.txt" }],
    });
  });

  it("deleteBranch DELETEs to /projects/:id/repository/branches/:branch with the branch name encoded", async () => {
    mockDelete.mockResolvedValue({ status: 204, data: "" });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await client.deleteBranch("mygroup/myproject", "feature/x");

    expect(mockDelete).toHaveBeenCalledWith(
      `${BASE_URL}/api/v4/projects/mygroup%2Fmyproject/repository/branches/feature%2Fx`
    );
  });

  it("deleteBranch maps a 401 response to AUTH_REQUIRED", async () => {
    mockDelete.mockResolvedValue({ status: 401, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.deleteBranch("42", "feature/x")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });
});
