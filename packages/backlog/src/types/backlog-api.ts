// ---------------------------------------------------------------------------
// Raw Backlog API response types
// These mirror exactly what the Backlog REST API v2 returns.
// Do NOT use these types outside of http-client.ts and mappers.ts.
// ---------------------------------------------------------------------------

export interface BacklogRawUser {
  id: number;
  userId: string | null;  // null for guest/restricted account types
  name: string | null;
  roleType: number;
  lang: string | null;
  mailAddress: string | null;
  lastLoginTime: string | null;
}

export interface BacklogRawIssueType {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface BacklogRawStatus {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface BacklogRawPriority {
  id: number;
  name: string;
}

export interface BacklogRawResolution {
  id: number;
  name: string;
}

export interface BacklogRawCategory {
  id: number;
  name: string;
  displayOrder?: number;
}

export interface BacklogRawMilestone {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  startDate: string | null;
  releaseDueDate: string | null;
  archived: boolean;
  displayOrder: number;
}

export interface BacklogRawAttachment {
  id: number;
  name: string;
  size: number;
  createdUser: BacklogRawUser;
  created: string;
}

export interface BacklogRawIssue {
  id: number;
  projectId: number;
  issueKey: string;
  keyId: number;
  issueType: BacklogRawIssueType;
  summary: string;
  description: string | null;
  resolution: BacklogRawResolution | null;
  priority: BacklogRawPriority | null;
  status: BacklogRawStatus;
  assignee: BacklogRawUser | null;
  category: BacklogRawCategory[];
  versions: BacklogRawMilestone[];
  milestone: BacklogRawMilestone[];
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  parentIssueId: number | null;
  createdUser: BacklogRawUser;
  updatedUser: BacklogRawUser;
  created: string;
  updated: string;
  attachments?: BacklogRawAttachment[];
  customFields?: unknown[];
}

export interface BacklogRawComment {
  id: number;
  content: string | null;
  changeLog: Array<{
    field: string;
    newValue: string | null;
    originalValue: string | null;
  }> | null;
  createdUser: BacklogRawUser;
  created: string;
  updated: string;
  stars: unknown[];
  notifications: unknown[];
}

export interface BacklogRawProject {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  subtaskingEnabled: boolean;
  useWiki: boolean;
  useFileSharing: boolean;
  useGit: boolean;
  textFormattingRule: string;
  archived: boolean;
  displayOrder: number;
}
