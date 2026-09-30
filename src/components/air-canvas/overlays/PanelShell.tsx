"use client";

import { Icon } from "../Icon";

interface PanelShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function PanelShell({ open, title, onClose, children }: PanelShellProps) {
  return (
    <aside
      aria-hidden={!open}
      inert={!open}
      className={`panel anim-slide-right thin-scroll absolute right-5 top-16 z-40 max-h-[calc(100dvh-8rem)] w-[19.5rem] max-w-[calc(100vw-2.5rem)] overflow-y-auto p-5 transition-all duration-300 ease-out ${
        open
          ? "visible translate-x-0 opacity-100"
          : "pointer-events-none invisible translate-x-5 opacity-0"
      }`}
    >
      <header className="flex items-center justify-between gap-4">
        <h2 className="display text-[1.75rem]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn h-8 w-8 shrink-0"
          aria-label="Close panel"
        >
          <Icon name="close" size={15} />
        </button>
      </header>
      <div className="mt-4">{children}</div>
    </aside>
  );
}
