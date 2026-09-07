import { defaultSessionDir, defaultDownloadsDir } from "./bootstrap.js";
import { join } from "path";
import { z } from "zod";
import { parseEnv } from "@cuongph.dev/mcp-core";

const nonEmptyStringOptional = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

// ---------------------------------------------------------------------------
// Schema — only user-facing variables are read from the environment.
// Internal/infra settings are hardcoded below.
// ---------------------------------------------------------------------------

const schema = z.object({
  JIRA_BASE_URL: z
    .string()
    .url("JIRA_BASE_URL must be a valid URL (e.g. https://jira.yourcompany.com)"),

  JIRA_EMAIL: z.string().min(1, "JIRA_EMAIL is required"),
  JIRA_PASSWORD: z.string().min(1, "JIRA_PASSWORD is required"),

  /** GitLab personal access token (required by jira_sync_gitlab_review_defects). */
  GITLAB_TOKEN: nonEmptyStringOptional,
  GITLAB_PROJECTS_JSON: nonEmptyStringOptional,
  GITLAB_PROJECTS_FILE: nonEmptyStringOptional,
  GITLAB_DEDUP_FILE: nonEmptyStringOptional,

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
});

// ---------------------------------------------------------------------------
// Hardcoded defaults — not configurable via .env
// ---------------------------------------------------------------------------

const DEFAULTS = {
  JIRA_VALIDATE_PATH: "/rest/api/2/myself",
  ATTACHMENT_WORKSPACE: defaultDownloadsDir,                   // absolute path
} as const;

export type Config = z.infer<typeof schema> & typeof DEFAULTS;

// ---------------------------------------------------------------------------
// Parse once at startup — callers import `config` directly
// ---------------------------------------------------------------------------

function loadConfig(): Config {
  const data = parseEnv(schema);
  return {
    ...DEFAULTS,
    ...data,
    GITLAB_PROJECTS_FILE:
      data.GITLAB_PROJECTS_FILE ?? join(defaultSessionDir, "gitlab-projects.json"),
    GITLAB_DEDUP_FILE:
      data.GITLAB_DEDUP_FILE ?? join(defaultSessionDir, "gitlab-review-defects.json"),
  };
}

export const config: Config = loadConfig();
