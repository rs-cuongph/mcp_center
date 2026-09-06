import axios, { type AxiosInstance } from "axios";

export function createHttpClient(opts: {
  baseURL: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}): AxiosInstance {
  return axios.create({
    baseURL: opts.baseURL,
    timeout: opts.timeoutMs ?? 30_000,
    headers: opts.headers,
    // Never throw on non-2xx here; callers map status → McpError.
    validateStatus: () => true,
  });
}
