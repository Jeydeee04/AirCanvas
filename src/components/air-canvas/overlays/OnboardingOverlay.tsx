"use client";

import { Icon, type IconName } from "../Icon";

interface OnboardingOverlayProps {
  open: boolean;
  busy: boolean;
  onEnableCamera: () => void;
  onDismiss: () => void;
}

const STEPS: { n: string; title: string; body: string; icon: IconName }[] = [
  {
    n: "01",
    title: "Pinch",
    body: "Touch thumb to index to put pen to paper.",
    icon: "draw",
  },
  {
    n: "02",
    title: "Victory",
    body: "Hold ✌ to cycle pen, marker and eraser.",
    icon: "cycle",
  },
  {
    n: "03",
    title: "Palm & fist",
    body: "Hold an open palm to zoom out, a closed fist to zoom in.",
    icon: "zoom-out",
  },
];

export function OnboardingOverlay({
  open,
  busy,
  onEnableCamera,
  onDismiss,
}: OnboardingOverlayProps) {
  if (!open) return null;

  return (
    <div className="anim-fade absolute inset-0 z-50 grid place-items-center bg-paper/85 p-5 backdrop-blur-sm">
      <div className="panel anim-rise w-full max-w-xl p-7 sm:p-9">
        <p className="eyebrow">MediaPipe · entirely in your browser</p>

        <h1 className="display mt-4 text-[clamp(2.6rem,8vw,4.4rem)]">
          Draw with
          <br />
          your hands
        </h1>

        <p className="mt-4 max-w-[48ch] text-[0.95rem] leading-relaxed text-ink-soft">
          Air Canvas turns your webcam into a brush. Your hand becomes the
          cursor, your gestures become the tools — no mouse, no tablet, no
          accounts.
        </p>

        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="border-l border-hairline pl-3.5">
              <div className="flex items-center gap-2">
                <span className="display text-[1.5rem] text-terracotta">
                  {step.n}
                </span>
                <Icon name={step.icon} size={14} className="text-ink-soft" />
              </div>
              <p className="mt-1 text-[0.82rem] font-semibold uppercase tracking-[0.14em]">
                {step.title}
              </p>
              <p className="mt-1 text-[0.78rem] leading-snug text-ink-soft">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onEnableCamera}
            disabled={busy}
            className="rounded-md bg-ink px-5 py-2.5 text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-paper-warm transition hover:opacity-90 active:translate-y-px disabled:opacity-60"
          >
            {busy ? "Waking camera…" : "Enable camera"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-hairline-strong px-5 py-2.5 text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-ink-soft transition hover:border-ink hover:text-ink"
          >
            Draw with mouse
          </button>
        </div>

        <p className="mt-5 text-[0.7rem] leading-relaxed text-ink-faint">
          Camera frames are processed locally with WebAssembly — nothing is
          uploaded, recorded or stored. You can turn the camera off at any time
          from the top-right.
        </p>
      </div>
    </div>
  );
}
