import { Icon, type IconName } from "@/components/ui/icon";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 20px",
      textAlign: "center",
    }}>
      <Icon name={icon} size={28} color="var(--text-muted-custom)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted-custom)", maxWidth: 280, lineHeight: 1.5 }}>
        {description}
      </div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
