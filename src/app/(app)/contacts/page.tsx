import { db } from "@/lib/db";
import {
  getContacts,
  getContactStatsCached,
  getContactFilterFacets,
} from "@/lib/queries/contact-queries";
import { ContactsListClient } from "@/components/contacts/contacts-list-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [contacts, stats, facets, tags, segments] = await Promise.all([
    getContacts(org.id),
    getContactStatsCached(org.id),
    getContactFilterFacets(org.id),
    db.contactTag.findMany({
      where: { organizationId: org.id },
      orderBy: { label: "asc" },
    }),
    db.contactSegment.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Load tag assignments for contacts in one shot.
  const assignments = await db.contactTagAssignment.findMany({
    where: { contactId: { in: contacts.map((c) => c.id) } },
    include: { tag: true },
  });
  const tagsByContact = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = tagsByContact.get(a.contactId) ?? [];
    list.push(a);
    tagsByContact.set(a.contactId, list);
  }

  const serializedContacts = contacts.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    initials: c.initials,
    avatarBg: c.avatarBg,
    avatarFg: c.avatarFg,
    photo: c.photo,
    outlet: c.outlet ?? "",
    beat: c.beat ?? "",
    tier: c.tier ?? "",
    health: c.health,
    createdAt: c.createdAt.toISOString(),
    lastContactDate: c.interactions[0]?.date?.toISOString() ?? null,
    tags: (tagsByContact.get(c.id) ?? []).map((a) => ({
      id: a.tag.id,
      label: a.tag.label,
      colorBg: a.tag.colorBg,
      colorFg: a.tag.colorFg,
    })),
  }));

  return (
    <ContactsListClient
      contacts={serializedContacts}
      stats={stats}
      beats={["All", ...facets.beats]}
      tags={tags.map((t) => ({
        id: t.id,
        label: t.label,
        colorBg: t.colorBg,
        colorFg: t.colorFg,
      }))}
      outlets={facets.outlets}
      tiers={facets.tiers}
      segments={segments.map((s) => ({
        id: s.id,
        name: s.name,
        filter: s.filter as object,
      }))}
    />
  );
}
