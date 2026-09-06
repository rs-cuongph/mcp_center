export class McpError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isMcpError(err: unknown): err is McpError {
  return err instanceof McpError;
}

export function configError(message: string, details?: unknown): McpError {
  return new McpError("CONFIG_ERROR", message, details);
}

export function invalidInput(message: string, details?: unknown): McpError {
  return new McpError("INVALID_INPUT", message, details);
}
