import { describe, it, expect } from "vitest";
import { parseCsvHeader, parseCsvRows } from "./csv-parser";

describe("parseCsvHeader", () => {
  it("extracts trimmed column names from first line", () => {
    const csv = "Name, Email ,Outlet\nJane,jane@ex.com,Vogue";
    expect(parseCsvHeader(csv)).toEqual(["Name", "Email", "Outlet"]);
  });
  it("returns empty array for empty input", () => {
    expect(parseCsvHeader("")).toEqual([]);
  });
});

describe("parseCsvRows", () => {
  it("returns rows keyed by header, trimming whitespace", () => {
    const csv = "Name,Email\nJane , jane@ex.com\nBob,bob@ex.com";
    const rows = parseCsvRows(csv);
    expect(rows).toEqual([
      { Name: "Jane", Email: "jane@ex.com" },
      { Name: "Bob", Email: "bob@ex.com" },
    ]);
  });
  it("skips fully empty rows", () => {
    const csv = "A,B\n1,2\n\n3,4";
    expect(parseCsvRows(csv)).toHaveLength(2);
  });
});
