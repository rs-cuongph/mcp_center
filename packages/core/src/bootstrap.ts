import { resolve, dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

export interface BootstrapResult {
  projectRoot: string;
  fromRoot: (p: string) => string;
  isNpmInstall: boolean;
  sessionDir: string;
  downloadsDir: string;
}

/**
 * Resolves install-relative dirs and loads the appropriate .env.
 * Local dev: <projectRoot>/<localDirName>; npm install: ~/<homeDirName>.
 */
export function setupBootstrap(opts: {
  moduleUrl: string;
  localDirName: string;
  homeDirName: string;
}): BootstrapResult {
  const thisFile = fileURLToPath(opts.moduleUrl);
  const projectRoot = dirname(dirname(thisFile));
  const fromRoot = (p: string): string => resolve(projectRoot, p);
  const isNpmInstall = projectRoot.includes("node_modules");

  const sessionDir = isNpmInstall
    ? join(homedir(), opts.homeDirName)
    : fromRoot(opts.localDirName);
  const downloadsDir = join(sessionDir, "downloads");

  loadDotenv({ path: isNpmInstall ? join(sessionDir, ".env") : fromRoot(".env") });

  return { projectRoot, fromRoot, isNpmInstall, sessionDir, downloadsDir };
}
