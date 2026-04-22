import { ContactImporter } from "@/components/contacts/contact-importer";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default function ContactImportPage() {
  return (
    <PageContainer>
      <PageHeader
        kicker="Contacts"
        title="Import contacts"
        subtitle="Upload a CSV and match its columns to Pressroom fields."
      />
      <ContactImporter />
    </PageContainer>
  );
}
