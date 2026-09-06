import { readFile } from "fs/promises";
import { basename } from "path";
import type { Config } from "../config.js";
import { createClient, errorContent } from "../utils.js";
import { isMcpError, invalidInput } from "../errors.js";

export interface UploadFileInput {
  channelId: string;
  filePath: string;
}

export async function handleUploadFile(
  input: UploadFileInput,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = await createClient(cfg);
  try {
    let buffer: Buffer;
    try {
      buffer = await readFile(input.filePath);
    } catch {
      throw invalidInput(`File not found or unreadable: ${input.filePath}`);
    }

    const filename = basename(input.filePath);
    const result = await client.uploadFile(input.channelId, buffer, filename);

    const lines = [
      "## ✅ File uploaded",
      "",
      `- **File ID**: \`${result.fileId}\``,
      `- **Name**: ${result.name}`,
      `- **Size**: ${result.sizeFormatted}`,
      `- **MIME type**: ${result.mimeType}`,
      "",
      "---",
      `💡 Use \`chatops_send_message_with_files\` with fileId \`${result.fileId}\` and a channelId to attach this file to a message.`,
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (err) {
    const msg = isMcpError(err) ? err.message : String(err);
    return errorContent(`Failed to upload file: ${msg}`);
  }
}
