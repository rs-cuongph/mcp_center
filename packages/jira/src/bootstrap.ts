import { setupBootstrap } from "@cuongph.dev/mcp-core";
import { join } from "node:path";

const boot = setupBootstrap({
  moduleUrl: import.meta.url,
  localDirName: ".jira",
  homeDirName: join(".jira", "jira-mcp"),
});

export const projectRoot = boot.projectRoot;
export const fromRoot = boot.fromRoot;
export const defaultSessionDir = boot.sessionDir;

// core setupBootstrap defaults downloadsDir to join(sessionDir, "downloads").
// For Jira local dev, the original behavior is <projectRoot>/downloads (not <projectRoot>/.jira/downloads).
// For npm install, both point to ~/.jira/jira-mcp/downloads.
export const defaultDownloadsDir = boot.isNpmInstall
  ? boot.downloadsDir
  : boot.fromRoot("downloads");
