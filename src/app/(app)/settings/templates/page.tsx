import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listTemplates } from "@/actions/template-actions";
import { TemplateForm } from "@/components/settings/template-form";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const templates = await listTemplates();

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Email templates
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted-custom)" }}>
          Reusable pitch templates with merge fields like {"{{contact.firstName}}"} and{" "}
          {"{{client.name}}"}.
        </p>
      </div>

      <TemplateForm
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
          body: t.body,
        }))}
      />
    </div>
  );
}
