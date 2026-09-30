"use client";

import { GESTURE_LEGEND, SHORTCUTS } from "../constants";
import { Icon } from "../Icon";
import { PanelShell } from "./PanelShell";

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

export function HelpPanel({ open, onClose }: HelpPanelProps) {
  return (
    <PanelShell open={open} title="Vocabulary" onClose={onClose}>
      <div className="space-y-5">
        <ul className="space-y-3">
          {GESTURE_LEGEND.map((entry) => (
            <li key={entry.gesture} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-hairline text-ink-soft">
                <Icon name={entry.icon} size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.82rem] font-semibold uppercase tracking-[0.1em]">
                  {entry.gesture}
                </p>
                <p className="text-[0.74rem] leading-snug text-ink-soft">
                  <span className="text-ink">{entry.action}</span> —{" "}
                  {entry.detail.toLowerCase()}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-[0.7rem] leading-relaxed text-ink-faint">
          Fist, thumbs up, thumbs down and the “I love you” sign are also
          recognised by the model — they simply stay idle so your drawing is
          never interrupted.
        </p>

        <div className="h-px bg-hairline" />

        <div>
          <p className="eyebrow">Keyboard</p>
          <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
            {SHORTCUTS.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between gap-2"
              >
                <dt className="text-[0.74rem] text-ink-soft">{s.label}</dt>
                <dd className="telemetry rounded border border-hairline bg-paper-warm px-1.5 py-0.5 text-[0.62rem] text-ink">
                  {s.keys}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="h-px bg-hairline" />

        <p className="text-[0.7rem] leading-relaxed text-ink-faint">
          Everything runs locally: the hand model, the gesture classifier and
          the camera feed never leave this tab.
        </p>
      </div>
    </PanelShell>
  );
}
