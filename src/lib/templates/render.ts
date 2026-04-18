export type RenderContext = {
  contact: { name: string; outlet?: string | null; beat?: string | null };
  client?: { name: string } | null;
  campaign?: { name: string } | null;
  sender: { name: string };
};

const TOKENS = [
  "contact.name",
  "contact.firstName",
  "contact.outlet",
  "contact.beat",
  "client.name",
  "campaign.name",
  "sender.name",
] as const;

export function availableTokens() {
  return [...TOKENS];
}

export function renderTemplate(template: string, ctx: RenderContext): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token) => {
    const v = resolve(token, ctx);
    return v ?? `[missing: ${token}]`;
  });
}

function resolve(token: string, ctx: RenderContext): string | null {
  switch (token) {
    case "contact.name": return ctx.contact.name;
    case "contact.firstName": return ctx.contact.name.split(/\s+/)[0] ?? null;
    case "contact.outlet": return ctx.contact.outlet ?? null;
    case "contact.beat": return ctx.contact.beat ?? null;
    case "client.name": return ctx.client?.name ?? null;
    case "campaign.name": return ctx.campaign?.name ?? null;
    case "sender.name": return ctx.sender.name;
    default: return null;
  }
}
