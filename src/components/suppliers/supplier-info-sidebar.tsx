import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";

interface SupplierContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
}

interface SupplierInfoSidebarProps {
  supplier: {
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    contacts: SupplierContact[];
  };
}

const infoFields = [
  { label: "Email", key: "email" as const },
  { label: "Phone", key: "phone" as const },
  { label: "Website", key: "website" as const },
];

export function SupplierInfoSidebar({ supplier }: SupplierInfoSidebarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Supplier Info Card */}
      <Card style={{ padding: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-sub)",
            marginBottom: 12,
          }}
        >
          Supplier Info
        </div>
        {infoFields.map((field, i) => (
          <div key={field.key}>
            {i > 0 && <Divider style={{ margin: "8px 0" }} />}
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted-custom)",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              {field.label}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
              }}
            >
              {supplier[field.key] || "\u2014"}
            </div>
          </div>
        ))}
      </Card>

      {/* People Card */}
      <Card style={{ padding: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-sub)",
            marginBottom: 12,
          }}
        >
          People at {supplier.name}
        </div>
        {supplier.contacts.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted-custom)",
            }}
          >
            No people added yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {supplier.contacts.map((contact) => (
              <div key={contact.id}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {contact.name}
                </div>
                {contact.role && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-sub)",
                      marginTop: 1,
                    }}
                  >
                    {contact.role}
                  </div>
                )}
                {contact.email && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      marginTop: 1,
                    }}
                  >
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      marginTop: 1,
                    }}
                  >
                    {contact.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
