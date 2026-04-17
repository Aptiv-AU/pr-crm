import { describe, it, expect } from "vitest";
import { mapRowsToContacts, CONTACT_IMPORT_FIELDS } from "./contact-import";

describe("CONTACT_IMPORT_FIELDS", () => {
  it("declares target fields with labels and required flag", () => {
    const nameField = CONTACT_IMPORT_FIELDS.find((f) => f.key === "name");
    expect(nameField).toBeDefined();
    expect(nameField?.required).toBe(true);
  });
});

describe("mapRowsToContacts", () => {
  const rows = [
    { FullName: "Jane Doe", Mail: "jane@ex.com", Pub: "Vogue" },
    { FullName: "", Mail: "bob@ex.com", Pub: "GQ" },
    { FullName: "Amy", Mail: "", Pub: "" },
  ];
  const mapping = { name: "FullName", email: "Mail", outlet: "Pub" };

  it("maps rows through field mapping", () => {
    const { valid } = mapRowsToContacts(rows, mapping);
    expect(valid[0]).toMatchObject({ name: "Jane Doe", email: "jane@ex.com", outlet: "Vogue" });
  });

  it("rejects rows missing required fields", () => {
    const { valid, skipped } = mapRowsToContacts(rows, mapping);
    expect(valid).toHaveLength(2); // Jane and Amy (name present)
    expect(skipped).toHaveLength(1); // Bob (no name)
    expect(skipped[0].reason).toMatch(/name/i);
  });

  it("normalises emails to lowercase", () => {
    const { valid } = mapRowsToContacts(
      [{ N: "X", E: "MiXeD@ExAmPlE.com" }],
      { name: "N", email: "E" }
    );
    expect(valid[0].email).toBe("mixed@example.com");
  });
});
