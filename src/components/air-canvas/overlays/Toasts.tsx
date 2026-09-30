"use client";

export interface Toast {
  id: number;
  msg: string;
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="chip anim-toast"
          style={{
            backgroundColor: "var(--color-ink)",
            borderColor: "var(--color-ink)",
            color: "var(--color-paper-warm)",
          }}
        >
          {toast.msg}
        </div>
      ))}
    </div>
  );
}
