export type ContactImportFieldKey =
  | "name" | "email" | "phone" | "outlet" | "beat" | "tier"
  | "instagram" | "twitter" | "linkedin" | "notes";

export const CONTACT_IMPORT_FIELDS: {
  key: ContactImportFieldKey;
  label: string;
  required: boolean;
  hint?: string;
  aliases?: string[];
}[] = [
  { key: "name", label: "Full name", required: true, aliases: ["name", "fullname", "contact", "contactname", "journalist", "reporter"] },
  { key: "email", label: "Email", required: false, hint: "Lowercased on import", aliases: ["email", "emailaddress", "e-mail", "mail"] },
  { key: "phone", label: "Phone", required: false, aliases: ["phone", "mobile", "cell", "telephone", "tel", "phonenumber"] },
  { key: "outlet", label: "Outlet / publication", required: false, aliases: ["outlet", "publication", "magazine", "masthead", "title", "media", "mediaoutlet", "company", "organisation", "organization"] },
  { key: "beat", label: "Beat", required: false, aliases: ["beat", "section", "topic", "category", "coverage", "vertical"] },
  { key: "tier", label: "Tier", required: false, hint: "e.g. A, B, C", aliases: ["tier", "priority", "rank"] },
  { key: "instagram", label: "Instagram", required: false, aliases: ["instagram", "ig", "insta", "instagramhandle", "ighandle"] },
  { key: "twitter", label: "Twitter / X", required: false, aliases: ["twitter", "x", "twitterhandle", "xhandle"] },
  { key: "linkedin", label: "LinkedIn", required: false, aliases: ["linkedin", "linkedinurl", "linkedinprofile"] },
  { key: "notes", label: "Notes", required: false, aliases: ["notes", "note", "comments", "comment", "description", "bio"] },
];

function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[\s_\-/]+/g, "");
}

export function suggestMapping(headers: string[]): ContactImportMapping {
  const mapping: ContactImportMapping = {};
  const used = new Set<string>();
  for (const field of CONTACT_IMPORT_FIELDS) {
    const candidates = new Set<string>([
      normalizeHeader(field.key),
      normalizeHeader(field.label),
      ...(field.aliases ?? []).map(normalizeHeader),
    ]);
    const match = headers.find((h) => !used.has(h) && candidates.has(normalizeHeader(h)));
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  }
  return mapping;
}

export type ContactImportMapping = Partial<Record<ContactImportFieldKey, string>>;

export type MappedContact = {
  name: string;
  email?: string;
  phone?: string;
  outlet?: string;
  beat?: string;
  tier?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  notes?: string;
};

export type SkippedRow = { rowIndex: number; reason: string; raw: Record<string, string> };

export function mapRowsToContacts(
  rows: Record<string, string>[],
  mapping: ContactImportMapping,
): { valid: MappedContact[]; skipped: SkippedRow[] } {
  const valid: MappedContact[] = [];
  const skipped: SkippedRow[] = [];

  rows.forEach((row, idx) => {
    const contact: Partial<MappedContact> = {};
    for (const field of CONTACT_IMPORT_FIELDS) {
      const sourceCol = mapping[field.key];
      if (!sourceCol) continue;
      const val = row[sourceCol]?.trim();
      if (!val) continue;
      contact[field.key] = field.key === "email" ? val.toLowerCase() : val;
    }

    if (!contact.name) {
      skipped.push({ rowIndex: idx, reason: "missing required field: name", raw: row });
      return;
    }
    valid.push(contact as MappedContact);
  });

  return { valid, skipped };
}
