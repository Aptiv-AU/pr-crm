import { notFound } from "next/navigation";
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

  // Serialize Dates to ISO strings and Decimals to numbers for client components
  const serializedContact = JSON.parse(JSON.stringify(contact));

  return (
    <div style={{ padding: "16px" }} className="md:p-6">
      <ContactDetailClient contact={serializedContact} stats={stats} />
    </div>
  );
}
