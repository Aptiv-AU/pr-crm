export type ContactImportFieldKey =
  | "name" | "email" | "phone" | "outlet" | "beat" | "tier"
  | "instagram" | "twitter" | "linkedin" | "notes";

export const CONTACT_IMPORT_FIELDS: {
  key: ContactImportFieldKey;
  label: string;
  required: boolean;
  hint?: string;
}[] = [
  { key: "name", label: "Full name", required: true },
  { key: "email", label: "Email", required: false, hint: "Lowercased on import" },
  { key: "phone", label: "Phone", required: false },
  { key: "outlet", label: "Outlet / publication", required: false },
  { key: "beat", label: "Beat", required: false },
  { key: "tier", label: "Tier", required: false, hint: "e.g. A, B, C" },
  { key: "instagram", label: "Instagram", required: false },
  { key: "twitter", label: "Twitter / X", required: false },
  { key: "linkedin", label: "LinkedIn", required: false },
  { key: "notes", label: "Notes", required: false },
];

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
