import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GitlabRawIssue, GitlabRawNote, GitlabRawUser } from "../types/gitlab-api.js";

// ---------------------------------------------------------------------------
// Mocks — stub `createHttpClient` so `GitlabHttpClient` never touches real
// axios/network; capture the args passed to `post` per test.
// ---------------------------------------------------------------------------
const { mockPost, mockCreateHttpClient } = vi.hoisted(() => {
  const post = vi.fn();
  return { mockPost: post, mockCreateHttpClient: vi.fn(() => ({ get: vi.fn(), post })) };
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
});
