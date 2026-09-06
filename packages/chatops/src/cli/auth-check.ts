import { config } from "../config.js";
import { makeAuthCli } from "@cuongph.dev/mcp-auth-playwright";
import { loadAndValidateSession } from "../auth/session-manager.js";

const cli = makeAuthCli({
  appName: "ChatOps",
  loginCommand: "chatops-auth-login",
  baseUrl: config.CHATOPS_URL,
  sessionFilePath: config.CHATOPS_SESSION_FILE,
  validatePath: config.CHATOPS_VALIDATE_PATH,
  headless: config.PLAYWRIGHT_HEADLESS,
  browser: config.PLAYWRIGHT_BROWSER,
  validate: loadAndValidateSession,
});

void cli.check();
