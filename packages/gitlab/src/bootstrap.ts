import { setupBootstrap } from "@cuongph.dev/mcp-core";
import { join } from "node:path";

const boot = setupBootstrap({
  moduleUrl: import.meta.url,
  localDirName: ".gitlab",
  homeDirName: join(".gitlab", "gitlab-mcp"),
});

export const projectRoot = boot.projectRoot;
export const fromRoot = boot.fromRoot;
export const defaultDownloadsDir = boot.downloadsDir;
