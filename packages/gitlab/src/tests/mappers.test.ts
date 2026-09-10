import { describe, it, expect } from "vitest";
import {
  mapUser,
  mapCurrentUser,
  mapProject,
  mapIssueSummary,
  mapIssue,
  mapMergeRequestSummary,
  mapMergeRequest,
  mapMrChange,
  mapNote,
  mapDiscussion,
  mapCommit,
  mapBranch,
  mapPipeline,
  mapJob,
  mapBlobSearchResult,
} from "../gitlab/mappers.js";
import type {
  GitlabRawUser,
  GitlabRawProject,
  GitlabRawIssue,
  GitlabRawMergeRequest,
  GitlabRawMrChange,
  GitlabRawNote,
  GitlabRawDiscussion,
  GitlabRawCommit,
  GitlabRawBranch,
  GitlabRawPipeline,
  GitlabRawJob,
  GitlabRawBlobSearchResult,
} from "../types/gitlab-api.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const rawUser: GitlabRawUser = {
  id: 7,
  username: "alice",
  name: "Alice Smith",
  state: "active",
  avatar_url: null,
  web_url: "https://devops.runsystem.info/alice",
  email: "alice@example.com",
};

const rawProject: GitlabRawProject = {
  id: 42,
  description: "A test project",
  name: "myproject",
  name_with_namespace: "My Group / myproject",
  path: "myproject",
  path_with_namespace: "mygroup/myproject",
  default_branch: "main",
  web_url: "https://devops.runsystem.info/mygroup/myproject",
  visibility: "private",
  star_count: 3,
  forks_count: 1,
  archived: false,
  last_activity_at: "2026-09-01T10:00:00Z",
  namespace: { id: 1, name: "My Group", path: "mygroup", kind: "group", full_path: "mygroup" },
  open_issues_count: 5,
};

const rawIssue: GitlabRawIssue = {
  id: 100,
  iid: 12,
  project_id: 42,
  title: "Fix login bug",
  description: "Steps to reproduce...",
  state: "opened",
  labels: ["bug", "urgent"],
  milestone: { id: 1, iid: 1, title: "v1.0", state: "active", due_date: null },
  assignees: [rawUser],
  author: rawUser,
  web_url: "https://devops.runsystem.info/mygroup/myproject/-/issues/12",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
  closed_at: null,
  due_date: "2026-09-15",
  confidential: false,
  user_notes_count: 3,
  upvotes: 0,
  downvotes: 0,
};

const rawMr: GitlabRawMergeRequest = {
  id: 200,
  iid: 5,
  project_id: 42,
  title: "Add login fix",
  description: "Fixes #12",
  state: "opened",
  draft: false,
  merge_status: "can_be_merged",
  has_conflicts: false,
  target_branch: "main",
  source_branch: "fix-login",
  author: rawUser,
  assignees: [rawUser],
  labels: ["bug"],
  web_url: "https://devops.runsystem.info/mygroup/myproject/-/merge_requests/5",
  created_at: "2026-08-03T00:00:00Z",
  updated_at: "2026-08-04T00:00:00Z",
  merged_at: null,
  closed_at: null,
  sha: "abc123",
  user_notes_count: 2,
  upvotes: 0,
  downvotes: 0,
};

// ---------------------------------------------------------------------------
// User mappers
// ---------------------------------------------------------------------------

describe("mapUser / mapCurrentUser", () => {
  it("maps core fields", () => {
    expect(mapUser(rawUser)).toEqual({
      id: 7,
      username: "alice",
      name: "Alice Smith",
      state: "active",
      webUrl: "https://devops.runsystem.info/alice",
    });
  });

  it("adds email for the current user, defaulting to null when absent", () => {
    expect(mapCurrentUser(rawUser).email).toBe("alice@example.com");
    expect(mapCurrentUser({ ...rawUser, email: undefined }).email).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Project mapper
// ---------------------------------------------------------------------------

describe("mapProject", () => {
  it("maps snake_case fields to camelCase", () => {
    const project = mapProject(rawProject);
    expect(project.pathWithNamespace).toBe("mygroup/myproject");
    expect(project.nameWithNamespace).toBe("My Group / myproject");
    expect(project.openIssuesCount).toBe(5);
  });

  it("defaults openIssuesCount to null when the API omits it", () => {
    const { open_issues_count, ...withoutCount } = rawProject;
    expect(mapProject(withoutCount as GitlabRawProject).openIssuesCount).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Issue mappers
// ---------------------------------------------------------------------------

describe("mapIssueSummary / mapIssue", () => {
  it("flattens milestone/author/assignees to plain strings", () => {
    const summary = mapIssueSummary(rawIssue);
    expect(summary.milestone).toBe("v1.0");
    expect(summary.author).toBe("alice");
    expect(summary.assignees).toEqual(["alice"]);
    expect(summary.labels).toEqual(["bug", "urgent"]);
  });

  it("mapIssue extends the summary with description", () => {
    const issue = mapIssue(rawIssue);
    expect(issue.description).toBe("Steps to reproduce...");
    expect(issue.iid).toBe(12);
  });

  it("maps a null milestone to null", () => {
    expect(mapIssueSummary({ ...rawIssue, milestone: null }).milestone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Merge request mappers
// ---------------------------------------------------------------------------

describe("mapMergeRequestSummary / mapMergeRequest", () => {
  it("maps branch and status fields", () => {
    const summary = mapMergeRequestSummary(rawMr);
    expect(summary.sourceBranch).toBe("fix-login");
    expect(summary.targetBranch).toBe("main");
    expect(summary.mergeStatus).toBe("can_be_merged");
    expect(summary.hasConflicts).toBe(false);
  });

  it("mapMergeRequest extends the summary with description", () => {
    expect(mapMergeRequest(rawMr).description).toBe("Fixes #12");
  });
});

describe("mapMrChange", () => {
  const change: GitlabRawMrChange = {
    old_path: "src/old.ts",
    new_path: "src/new.ts",
    new_file: false,
    renamed_file: true,
    deleted_file: false,
    diff: [
      "--- a/src/old.ts",
      "+++ b/src/new.ts",
      "@@ -1,3 +1,4 @@",
      " context line",
      "-removed line 1",
      "-removed line 2",
      "+added line 1",
      "+added line 2",
      "+added line 3",
    ].join("\n"),
  };

  it("counts +/- lines while excluding the +++/--- file headers", () => {
    const mapped = mapMrChange(change);
    expect(mapped.additions).toBe(3);
    expect(mapped.deletions).toBe(2);
    expect(mapped.isRenamed).toBe(true);
    expect(mapped.path).toBe("src/new.ts");
  });

  it("falls back to old_path when new_path is empty (deleted file)", () => {
    const deleted: GitlabRawMrChange = { ...change, new_path: "", deleted_file: true, renamed_file: false };
    expect(mapMrChange(deleted).path).toBe("src/old.ts");
  });
});

// ---------------------------------------------------------------------------
// Note / discussion mappers
// ---------------------------------------------------------------------------

describe("mapNote / mapDiscussion", () => {
  const rawNote: GitlabRawNote = {
    id: 1,
    body: "Looks good to me",
    author: rawUser,
    created_at: "2026-08-05T00:00:00Z",
    updated_at: "2026-08-05T00:00:00Z",
    system: false,
  };

  it("maps author to username", () => {
    expect(mapNote(rawNote).author).toBe("alice");
  });

  it("maps a discussion's nested notes", () => {
    const rawDiscussion: GitlabRawDiscussion = { id: "d1", individual_note: false, notes: [rawNote] };
    const discussion = mapDiscussion(rawDiscussion);
    expect(discussion.id).toBe("d1");
    expect(discussion.notes).toHaveLength(1);
    expect(discussion.notes[0].body).toBe("Looks good to me");
  });
});

// ---------------------------------------------------------------------------
// Repository mappers
// ---------------------------------------------------------------------------

describe("mapCommit / mapBranch", () => {
  it("maps a commit", () => {
    const rawCommit: GitlabRawCommit = {
      id: "abcdef1234567890",
      short_id: "abcdef12",
      title: "Fix bug",
      message: "Fix bug\n\nDetails",
      author_name: "Alice Smith",
      author_email: "alice@example.com",
      authored_date: "2026-08-01T00:00:00Z",
      committed_date: "2026-08-01T00:00:00Z",
      web_url: "https://devops.runsystem.info/mygroup/myproject/-/commit/abcdef1234567890",
    };
    expect(mapCommit(rawCommit).shortId).toBe("abcdef12");
  });

  it("maps a branch's nested commit", () => {
    const rawBranch: GitlabRawBranch = {
      name: "main",
      commit: { id: "abc", short_id: "abc123", title: "Init", committed_date: "2026-08-01T00:00:00Z" },
      merged: false,
      protected: true,
      default: true,
      web_url: "https://devops.runsystem.info/mygroup/myproject/-/tree/main",
    };
    const branch = mapBranch(rawBranch);
    expect(branch.commitShortId).toBe("abc123");
    expect(branch.default).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pipeline / job mappers
// ---------------------------------------------------------------------------

describe("mapPipeline / mapJob", () => {
  it("maps a pipeline", () => {
    const rawPipeline: GitlabRawPipeline = {
      id: 900,
      iid: 3,
      project_id: 42,
      sha: "abc123",
      ref: "main",
      status: "success",
      source: "push",
      web_url: "https://devops.runsystem.info/mygroup/myproject/-/pipelines/900",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:10:00Z",
      duration: 120,
    };
    expect(mapPipeline(rawPipeline).status).toBe("success");
  });

  it("maps a job", () => {
    const rawJob: GitlabRawJob = {
      id: 1,
      name: "test",
      stage: "test",
      status: "success",
      created_at: "2026-08-01T00:00:00Z",
      started_at: "2026-08-01T00:01:00Z",
      finished_at: "2026-08-01T00:02:00Z",
      duration: 60,
      web_url: "https://devops.runsystem.info/mygroup/myproject/-/jobs/1",
    };
    expect(mapJob(rawJob).stage).toBe("test");
  });
});

// ---------------------------------------------------------------------------
// Search mapper
// ---------------------------------------------------------------------------

describe("mapBlobSearchResult", () => {
  it("maps blob search snippet fields", () => {
    const raw: GitlabRawBlobSearchResult = {
      basename: "index",
      data: "export function foo() {}",
      path: "src/index.ts",
      filename: "index.ts",
      id: null,
      ref: "main",
      startline: 10,
      project_id: 42,
    };
    const mapped = mapBlobSearchResult(raw);
    expect(mapped.snippet).toBe("export function foo() {}");
    expect(mapped.startLine).toBe(10);
  });
});
