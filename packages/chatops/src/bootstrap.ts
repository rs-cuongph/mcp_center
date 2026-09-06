import { setupBootstrap } from "@cuongph.dev/mcp-core";
import { join } from "node:path";

const boot = setupBootstrap({
  moduleUrl: import.meta.url,
  localDirName: ".chatops",
  homeDirName: join(".chatops", "chatops-mcp"),
});

export const projectRoot = boot.projectRoot;
export const fromRoot = boot.fromRoot;
export const defaultSessionDir = boot.sessionDir;
export const defaultDownloadsDir = boot.downloadsDir;
