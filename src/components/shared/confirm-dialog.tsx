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
          backgroundColor: "var(--card-bg)", borderRadius: 16, padding: 28,
          maxWidth: 420, width: "calc(100% - 32px)", margin: "0 16px",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-extrabold tracking-tight" style={{ color: "var(--text-primary)", marginBottom: 8 }}>
          {title}
        </div>
        <div className="text-sm font-medium" style={{ color: "var(--text-sub)", marginBottom: 24 }}>
          {body}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-5 py-2 text-[13px] font-bold cursor-pointer"
            style={{
              border: "none",
              backgroundColor: "var(--surface-container-low)",
              color: "var(--text-primary)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full px-5 py-2 text-[13px] font-bold"
            style={{
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
