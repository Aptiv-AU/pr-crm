import { describe, it, expect } from "vitest";
import { renderTemplate, availableTokens } from "./render";

describe("renderTemplate", () => {
  const ctx = {
    contact: { name: "Jane Doe", outlet: "Vogue", beat: null },
    client: { name: "Acme" },
    campaign: { name: "SS26 Launch" },
    sender: { name: "Scott" },
  };

  it("replaces simple tokens", () => {
    expect(renderTemplate("Hi {{contact.name}} at {{contact.outlet}}", ctx))
      .toBe("Hi Jane Doe at Vogue");
  });
  it("derives firstName from name", () => {
    expect(renderTemplate("Hi {{contact.firstName}}", ctx)).toBe("Hi Jane");
  });
  it("flags unknown tokens as [missing: …]", () => {
    expect(renderTemplate("{{contact.unknown}}", ctx)).toBe("[missing: contact.unknown]");
  });
  it("shows [missing: …] for null fields", () => {
    expect(renderTemplate("{{contact.beat}}", ctx)).toBe("[missing: contact.beat]");
  });
  it("availableTokens lists known tokens", () => {
    expect(availableTokens()).toContain("contact.name");
    expect(availableTokens()).toContain("client.name");
  });
});
