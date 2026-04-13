import { db } from "@/lib/db";
import { getContacts, getContactStats, getContactBeats } from "@/lib/queries/contact-queries";
import { ContactsListClient } from "@/components/contacts/contacts-list-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [contacts, stats, beats] = await Promise.all([
    getContacts(org.id),
    getContactStats(org.id),
    getContactBeats(org.id),
  ]);

  const serializedContacts = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    avatarBg: c.avatarBg,
    avatarFg: c.avatarFg,
    publication: c.publication,
    beat: c.beat,
    tier: c.tier,
    health: c.health,
    createdAt: c.createdAt.toISOString(),
    lastContactDate: c.interactions[0]?.date?.toISOString() ?? null,
  }));

  return (
    <ContactsListClient
      contacts={serializedContacts}
      stats={stats}
      beats={["All", ...beats]}
    />
  );
}
