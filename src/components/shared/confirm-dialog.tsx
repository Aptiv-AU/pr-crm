interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, backgroundColor: "var(--overlay)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "var(--card-bg)", borderRadius: 12, padding: 24,
          maxWidth: 380, width: "100%", margin: "0 16px",
          border: "1px solid var(--border-custom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 20 }}>
          {body}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "6px 14px", fontSize: 13, fontWeight: 500, borderRadius: 8,
              border: "1px solid var(--border-custom)", backgroundColor: "transparent",
              color: "var(--text-sub)", cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            style={{
              padding: "6px 14px", fontSize: 13, fontWeight: 500, borderRadius: 8,
              border: "none", backgroundColor: "var(--accent-custom)",
              color: "#fff", cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
