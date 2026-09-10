import { describe, it, expect } from "vitest";
import { parseLabels } from "../utils.js";

describe("parseLabels", () => {
  it("returns undefined when labels is not provided", () => {
    expect(parseLabels(undefined)).toBeUndefined();
  });

  it("splits a comma-separated string and trims each label", () => {
    expect(parseLabels("bug, urgent ,ui")).toEqual(["bug", "urgent", "ui"]);
  });

  it("trims and drops empty entries from an array input", () => {
    expect(parseLabels([" bug ", "urgent", ""])).toEqual(["bug", "urgent"]);
  });

  it("returns an empty array for an empty string, to signal clearing all labels", () => {
    expect(parseLabels("")).toEqual([]);
  });

  it("returns an empty array for an empty array, to signal clearing all labels", () => {
    expect(parseLabels([])).toEqual([]);
  });
});
