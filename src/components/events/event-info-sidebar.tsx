import { Card } from "@/components/ui/card";

interface EventInfoSidebarProps {
  eventDetail: {
    id: string;
    venue: string | null;
    eventDate: string | null;
    eventTime: string | null;
    guestCount: number | null;
  };
  campaignSuppliers: {
    id: string;
    role: string | null;
    agreedCost: number | null;
    supplier: {
      id: string;
      name: string;
      serviceCategory: string | null;
    };
  }[];
}

function formatEventDate(date: string | null): string {
  if (!date) return "\u2014";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(value);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted-custom)" }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function EventInfoSidebar({ eventDetail, campaignSuppliers }: EventInfoSidebarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Event Info */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
          Event Info
        </div>
        <InfoRow label="Venue" value={eventDetail.venue || "\u2014"} />
        <InfoRow label="Date" value={formatEventDate(eventDetail.eventDate)} />
        <InfoRow label="Time" value={eventDetail.eventTime || "\u2014"} />
        <InfoRow
          label="Guest count"
          value={eventDetail.guestCount != null ? String(eventDetail.guestCount) : "\u2014"}
        />
      </Card>

      {/* Event Suppliers */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
          Event Suppliers
        </div>
        {campaignSuppliers.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted-custom)" }}>No suppliers linked</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {campaignSuppliers.map((cs) => (
              <div key={cs.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--border-custom)" }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{cs.supplier.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                    {cs.role || cs.supplier.serviceCategory || "\u2014"}
                  </span>
                  {cs.agreedCost != null && (
                    <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                      {formatCurrency(cs.agreedCost)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
