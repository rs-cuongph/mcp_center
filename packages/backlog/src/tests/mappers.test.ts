import { describe, it, expect } from "vitest";
import { mapIssue, mapIssueSummary, mapComment } from "../backlog/mappers.js";
import type { BacklogRawIssue, BacklogRawComment } from "../types/backlog-api.js";

const BASE_URL = "https://yourspace.backlog.com";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const rawUser = {
  id: 1,
  userId: "alice",
  name: "Alice Smith",
  roleType: 1,
  lang: "en",
  mailAddress: "alice@example.com",
  lastLoginTime: "2024-01-20T10:00:00Z",
};

const rawIssueType = {
  id: 2,
  projectId: 10,
  name: "Bug",
  color: "#990000",
  displayOrder: 0,
};

const rawStatus = {
  id: 1,
  projectId: 10,
  name: "Open",
  color: "#ff9200",
  displayOrder: 1,
};

const rawPriority = { id: 2, name: "High" };

const rawFullIssue: BacklogRawIssue = {
  id: 42,
  projectId: 10,
  issueKey: "BLG-42",
  keyId: 42,
  issueType: rawIssueType,
  summary: "Fix login bug",
  description: "Users cannot log in after session expires.",
  resolution: null,
  priority: rawPriority,
  status: rawStatus,
  assignee: rawUser,
  category: [{ id: 1, name: "Backend" }],
  versions: [],
  milestone: [{ id: 5, projectId: 10, name: "v2.0", description: null, startDate: null, releaseDueDate: "2024-06-01", archived: false, displayOrder: 0 }],
  startDate: "2024-01-15",
  dueDate: "2024-01-31",
  estimatedHours: 8,
  actualHours: 3,
  parentIssueId: null,
  createdUser: rawUser,
  updatedUser: rawUser,
  created: "2024-01-15T10:00:00Z",
  updated: "2024-01-20T15:30:00Z",
};

// ---------------------------------------------------------------------------
// mapIssue tests
// ---------------------------------------------------------------------------

describe("mapIssue", () => {
  it("maps all core fields correctly", () => {
    const result = mapIssue(rawFullIssue, BASE_URL);

    expect(result.id).toBe(42);
    expect(result.issueKey).toBe("BLG-42");
    expect(result.summary).toBe("Fix login bug");
    expect(result.description).toBe("Users cannot log in after session expires.");
    expect(result.status).toBe("Open");
    expect(result.priority).toBe("High");
    expect(result.issueType).toBe("Bug");
    expect(result.assignee).toBe("Alice Smith");
    expect(result.reporter).toBe("Alice Smith");
    expect(result.url).toBe(`${BASE_URL}/view/BLG-42`);
  });

  it("maps categories, milestones, and versions", () => {
    const result = mapIssue(rawFullIssue, BASE_URL);
    expect(result.categories).toEqual(["Backend"]);
    expect(result.milestones).toEqual(["v2.0"]);
    expect(result.versions).toEqual([]);
  });

  it("maps date and hour fields", () => {
    const result = mapIssue(rawFullIssue, BASE_URL);
    expect(result.startDate).toBe("2024-01-15");
    expect(result.dueDate).toBe("2024-01-31");
    expect(result.estimatedHours).toBe(8);
    expect(result.actualHours).toBe(3);
  });

  it("maps null assignee to null", () => {
    const raw = { ...rawFullIssue, assignee: null };
    const result = mapIssue(raw, BASE_URL);
    expect(result.assignee).toBeNull();
  });

  it("maps null description to null", () => {
    const raw = { ...rawFullIssue, description: null };
    const result = mapIssue(raw, BASE_URL);
    expect(result.description).toBeNull();
  });

  it("maps null priority to null", () => {
    const raw = { ...rawFullIssue, priority: null };
    const result = mapIssue(raw, BASE_URL);
    expect(result.priority).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapIssueSummary tests
// ---------------------------------------------------------------------------

describe("mapIssueSummary", () => {
  it("returns compact fields without description or reporter", () => {
    const result = mapIssueSummary(rawFullIssue, BASE_URL);

    expect(result.issueKey).toBe("BLG-42");
    expect(result.summary).toBe("Fix login bug");
    expect(result.status).toBe("Open");
    expect(result.assignee).toBe("Alice Smith");
    expect(result.url).toBe(`${BASE_URL}/view/BLG-42`);

    // Description and reporter are only in BacklogIssue (full), not BacklogIssueSummary
    expect((result as unknown as Record<string, unknown>)["description"]).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)["reporter"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mapComment tests
// ---------------------------------------------------------------------------

describe("mapComment", () => {
  const rawComment: BacklogRawComment = {
    id: 100,
    content: "This is a test comment.",
    changeLog: [
      { field: "status", originalValue: "Open", newValue: "InProgress" },
    ],
    createdUser: rawUser,
    created: "2024-01-16T09:00:00Z",
    updated: "2024-01-16T09:00:00Z",
    stars: [],
    notifications: [],
  };

  it("maps all comment fields", () => {
    const result = mapComment(rawComment);
    expect(result.id).toBe(100);
    expect(result.author).toBe("Alice Smith");
    expect(result.content).toBe("This is a test comment.");
    expect(result.created).toBe("2024-01-16T09:00:00Z");
  });

  it("maps changelog entries", () => {
    const result = mapComment(rawComment);
    expect(result.changeLog).toHaveLength(1);
    expect(result.changeLog[0].field).toBe("status");
    expect(result.changeLog[0].originalValue).toBe("Open");
    expect(result.changeLog[0].newValue).toBe("InProgress");
  });

  it("maps null content to null", () => {
    const raw = { ...rawComment, content: null };
    const result = mapComment(raw);
    expect(result.content).toBeNull();
  });

  it("returns empty changeLog array when none", () => {
    const raw = { ...rawComment, changeLog: [] };
    const result = mapComment(raw);
    expect(result.changeLog).toEqual([]);
  });
});
