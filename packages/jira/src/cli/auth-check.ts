import { config } from "../config.js";
import { makeAuthCli } from "@cuongph.dev/mcp-auth-playwright";
import { loadAndValidateSession } from "../auth/session-manager.js";

const cli = makeAuthCli({
  appName: "Jira",
  loginCommand: "jira-auth-login",
  baseUrl: config.JIRA_BASE_URL,
  sessionFilePath: config.JIRA_SESSION_FILE,
  validatePath: config.JIRA_VALIDATE_PATH,
  headless: config.PLAYWRIGHT_HEADLESS,
  browser: config.PLAYWRIGHT_BROWSER,
  validate: loadAndValidateSession,
});

void cli.check();
