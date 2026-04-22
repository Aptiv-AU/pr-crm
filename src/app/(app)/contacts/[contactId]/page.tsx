import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getContactByIdCached, getContactDetailStats } from "@/lib/queries/contact-queries";
import { ContactDetailClient } from "@/components/contacts/contact-detail-client";
import { isCuid } from "@/lib/slug/resolve";

export const dynamic = "force-dynamic";


export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId: handle } = await params;

  // Resolve handle (cuid or slug) → cuid
  let contactId: string | null = null;
  if (isCuid(handle)) {
    contactId = handle;
  } else {
    const org = await db.organization.findFirst({ select: { id: true } });
    if (org) {
      const found = await db.contact.findFirst({
        where: { organizationId: org.id, slug: handle },
        select: { id: true },
      });
      contactId = found?.id ?? null;
    }
  }

  if (!contactId) {
    notFound();
  }

  const [contact, stats] = await Promise.all([
    getContactByIdCached(contactId),
    getContactDetailStats(contactId),
  ]);

  if (!contact) {
    notFound();
  }

  const [assignments, allTags] = await Promise.all([
    db.contactTagAssignment.findMany({
      where: { contactId },
      include: { tag: true },
    }),
    db.contactTag.findMany({
      where: { organizationId: contact.organizationId },
      orderBy: { label: "asc" },
    }),
  ]);

  // Serialize Dates to ISO strings and Decimals to numbers for client components
  const serializedContact = JSON.parse(JSON.stringify(contact));

  const assignedTags = assignments.map((a) => ({
    id: a.tag.id,
    label: a.tag.label,
    colorBg: a.tag.colorBg,
    colorFg: a.tag.colorFg,
  }));
  const availableTags = allTags.map((t) => ({
    id: t.id,
    label: t.label,
    colorBg: t.colorBg,
    colorFg: t.colorFg,
  }));

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto">
      <ContactDetailClient
        contact={serializedContact}
        stats={stats}
        assignedTags={assignedTags}
        availableTags={availableTags}
      />
    </div>
  );
}
