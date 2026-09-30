"use client";

import { Icon } from "../Icon";
import type { EngineStatus, GestureFlags, GestureTelemetry } from "../useGestureEngine";

interface StatusStripProps {
  status: EngineStatus;
  error: string | null;
  flags: GestureFlags;
  telemetry: GestureTelemetry;
  toolLabel: string;
  panel: "settings" | "help" | null;
  onTogglePanel: (panel: "settings" | "help") => void;
  onToggleCamera: () => void;
}

export function StatusStrip({
  status,
  error,
  flags,
  telemetry,
  toolLabel,
  panel,
  onTogglePanel,
  onToggleCamera,
}: StatusStripProps) {
  const live = status === "running";

  let pill = "Camera off";
  if (status === "starting") pill = "Waking the camera…";
  else if (status === "denied" || status === "error") pill = error ?? "Camera unavailable";
  else if (live) {
    if (flags.drawing) pill = "Pinch · drawing";
    else if (flags.paused) pill = "Open palm · paused";
    else if (telemetry.gesture === "Victory") pill = "Victory · release to switch";
    else if (telemetry.gesture) pill = `${telemetry.gesture.replace("_", " ")} · ${toolLabel}`;
    else if (telemetry.handPresent) pill = `Hand tracked · ${toolLabel}`;
    else pill = "Show a hand to the camera";
  }

  const pillActive = flags.drawing || flags.paused || status === "starting";

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-4 px-5 py-4">
      {/* Wordmark */}
      <div className="pointer-events-auto flex items-baseline gap-3">
        <span className="display text-[1.9rem] leading-none">Air Canvas</span>
        <span className="hidden h-4 w-px bg-hairline-strong sm:block" />
        <span className="eyebrow hidden sm:block">Gesture Studio</span>
      </div>

      {/* Live state pill */}
      <div className="pointer-events-none hidden min-w-0 justify-self-center pt-1 sm:flex">
        <span
          className="chip max-w-[22rem] truncate"
          data-active={pillActive}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              live ? (telemetry.handPresent ? "bg-sage" : "bg-ink-faint") : "bg-terracotta"
            } ${live ? "anim-pulse" : ""}`}
          />
          <span className="truncate">{pill}</span>
        </span>
      </div>

      {/* Telemetry + controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        {live ? (
          <span className="telemetry hidden text-ink-soft md:inline">
            {telemetry.fps} fps · {telemetry.pinchMm} mm
          </span>
        ) : status === "starting" ? (
          <span className="chip anim-pulse">Connecting</span>
        ) : (
          <button type="button" className="chip" data-active onClick={onToggleCamera}>
            <Icon name="camera" size={13} />
            {status === "denied" || status === "error" ? "Retry camera" : "Start camera"}
          </button>
        )}

        <button
          type="button"
          className="icon-btn h-9 w-9"
          data-active={panel === "help"}
          aria-label="Gesture guide"
          onClick={() => onTogglePanel("help")}
        >
          <Icon name="help" size={17} />
        </button>
        <button
          type="button"
          className="icon-btn h-9 w-9"
          data-active={panel === "settings"}
          aria-label="Settings"
          onClick={() => onTogglePanel("settings")}
        >
          <Icon name="sliders" size={17} />
        </button>
      </div>
    </header>
  );
}
