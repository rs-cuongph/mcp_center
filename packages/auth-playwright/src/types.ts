export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface StorageOrigin {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

export interface StorageState {
  cookies?: PlaywrightCookie[];
  origins?: StorageOrigin[];
}

export type PlaywrightStorageState = StorageState;

export interface SessionFile {
  savedAt?: string;
  baseUrl?: string;
  storageState: StorageState;
}

export interface SessionCookies {
  cookieHeader: string;
}
