import "./bootstrap.js";
import { z } from "zod";
import { parseEnv } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Schema — user-facing variables read from the environment.
// ---------------------------------------------------------------------------

const schema = z.object({
  GITLAB_URL: z
    .string()
    .url("GITLAB_URL must be a valid URL (e.g. https://gitlab.yourcompany.com)"),

  GITLAB_TOKEN: z
    .string()
    .min(1, "GITLAB_TOKEN must not be empty"),

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),

  /** REST path used to validate the token in gitlab_get_current_user. Override via env for self-hosted setups behind a reverse proxy that remaps the API path. */
  GITLAB_VALIDATE_PATH: z
    .string()
    .min(1, "GITLAB_VALIDATE_PATH must not be empty")
    .default("/api/v4/user"),
});

export type Config = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Parse once at startup — callers import `config` directly
// ---------------------------------------------------------------------------

export const config: Config = parseEnv(schema);
