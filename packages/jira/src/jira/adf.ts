import { invalidInput } from "../errors.js";

// ---------------------------------------------------------------------------
// ADF node type interfaces
// ---------------------------------------------------------------------------

export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface AdfTextNode {
  type: "text";
  text: string;
  marks?: AdfMark[];
}

export interface AdfParagraphNode {
  type: "paragraph";
  content: AdfTextNode[];
}

export interface AdfHeadingNode {
  type: "heading";
  attrs: { level: number };
  content: AdfTextNode[];
}

export interface AdfListItemNode {
  type: "listItem";
  content: Array<AdfParagraphNode | AdfBulletListNode | AdfOrderedListNode>;
}

export interface AdfBulletListNode {
  type: "bulletList";
  content: AdfListItemNode[];
}

export interface AdfOrderedListNode {
  type: "orderedList";
  content: AdfListItemNode[];
}

export interface AdfCodeBlockNode {
  type: "codeBlock";
  attrs?: { language?: string };
  content: AdfTextNode[];
}

export interface AdfBlockquoteNode {
  type: "blockquote";
  content: Array<AdfParagraphNode>;
}

export interface AdfTableCellNode {
  type: "tableCell";
  attrs?: { colspan?: number; rowspan?: number; colwidth?: number[] };
  content: Array<AdfParagraphNode>;
}

export interface AdfTableHeaderNode {
  type: "tableHeader";
  attrs?: { colspan?: number; rowspan?: number; colwidth?: number[] };
  content: Array<AdfParagraphNode>;
}

export interface AdfTableRowNode {
  type: "tableRow";
  content: Array<AdfTableHeaderNode | AdfTableCellNode>;
}

export interface AdfTableNode {
  type: "table";
  attrs?: { isNumberColumnEnabled?: boolean; layout?: string };
  content: AdfTableRowNode[];
}

export type AdfNode =
  | AdfParagraphNode
  | AdfHeadingNode
  | AdfBulletListNode
  | AdfOrderedListNode
  | AdfCodeBlockNode
  | AdfBlockquoteNode
  | AdfTableNode;

export interface AdfDocument {
  type: "doc";
  version: number;
  content: AdfNode[];
}

// ---------------------------------------------------------------------------
// Builders & validators
// ---------------------------------------------------------------------------

export function buildMinimalAdfDocument(text: string): AdfDocument {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export function isAdfDocument(value: unknown): value is AdfDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const maybeDoc = value as {
    type?: unknown;
    version?: unknown;
    content?: unknown;
  };

  return (
    maybeDoc.type === "doc" &&
    maybeDoc.version === 1 &&        // must be exactly 1, not just a number
    Array.isArray(maybeDoc.content)  // content array is required (may be empty)
  );
}

// Legacy — keep for backward compat with existing callers outside tools
export function normalizeAdfValue(value: unknown): string | AdfDocument {
  if (typeof value === "string") {
    return buildMinimalAdfDocument(value);
  }

  if (isAdfDocument(value)) {
    return value;
  }

  throw invalidInput("description/comment body must be a string or a valid ADF document.");
}
