import Papa from "papaparse";

export function parseCsvHeader(csv: string): string[] {
  if (!csv.trim()) return [];
  const firstLine = csv.split(/\r?\n/)[0];
  const parsed = Papa.parse<string[]>(firstLine, { skipEmptyLines: true });
  return (parsed.data[0] ?? []).map((s) => s.trim());
}

export function parseCsvRows(csv: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) out[k.trim()] = (v ?? "").trim();
    return out;
  });
}
