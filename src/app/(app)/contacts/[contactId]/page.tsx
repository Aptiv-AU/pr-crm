import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getContactById, getContactDetailStats } from "@/lib/queries/contact-queries";
import { ContactDetailClient } from "@/components/contacts/contact-detail-client";

export const dynamic = "force-dynamic";


export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;

  const [contact, stats] = await Promise.all([
    getContactById(contactId),
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
    <div style={{ padding: "16px" }} className="md:p-6">
      <ContactDetailClient
        contact={serializedContact}
        stats={stats}
        assignedTags={assignedTags}
        availableTags={availableTags}
      />
    </div>
  );
}
