"use client";

import { BACKGROUNDS } from "../constants";
import type { Background } from "../drawing-engine";
import type { EngineStatus, GestureSettings } from "../useGestureEngine";
import { PanelShell } from "./PanelShell";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: GestureSettings;
  background: Background;
  status: EngineStatus;
  onChange: (patch: Partial<GestureSettings>) => void;
  onBackground: (bg: Background) => void;
  onToggleCamera: () => void;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`h-5 w-9 shrink-0 rounded-full border transition-colors ${
        checked ? "border-ink bg-ink" : "border-hairline-strong bg-transparent"
      }`}
    >
      <span
        className={`block h-3.5 w-3.5 rounded-full transition-transform ${
          checked
            ? "translate-x-[1.18rem] bg-paper-warm"
            : "translate-x-[0.15rem] bg-ink"
        }`}
      />
    </button>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  leftHint,
  rightHint,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  leftHint: string;
  rightHint: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="telemetry text-ink">{display}</span>
      </div>
      <input
        type="range"
        className="range mt-3"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="mt-1.5 flex justify-between text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint">
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </div>
    </div>
  );
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  background,
  status,
  onChange,
  onBackground,
  onToggleCamera,
}: SettingsPanelProps) {
  const live = status === "running";

  return (
    <PanelShell open={open} title="Settings" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.82rem] font-medium">Mirror camera</p>
            <p className="text-[0.7rem] text-ink-soft">Natural left/right</p>
          </div>
          <Toggle
            label="Mirror camera"
            checked={settings.mirror}
            onChange={(v) => onChange({ mirror: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.82rem] font-medium">Hand guide</p>
            <p className="text-[0.7rem] text-ink-soft">
              Faint skeleton on the canvas
            </p>
          </div>
          <Toggle
            label="Hand guide"
            checked={settings.showGuide}
            onChange={(v) => onChange({ showGuide: v })}
          />
        </div>

        <div className="h-px bg-hairline" />

        <SliderRow
          label="Cursor response"
          value={settings.smoothing}
          display={settings.smoothing.toFixed(2)}
          min={0.1}
          max={0.9}
          step={0.05}
          leftHint="Silky"
          rightHint="Snappy"
          onChange={(v) => onChange({ smoothing: v })}
        />

        <SliderRow
          label="Pinch starts at"
          value={settings.pinchEnterMm}
          display={`${settings.pinchEnterMm} mm`}
          min={30}
          max={80}
          step={2}
          leftHint="Tight"
          rightHint="Loose"
          onChange={(v) =>
            onChange({ pinchEnterMm: v, pinchExitMm: Math.max(v + 4, settings.pinchExitMm) })
          }
        />

        <SliderRow
          label="Pinch releases at"
          value={settings.pinchExitMm}
          display={`${settings.pinchExitMm} mm`}
          min={34}
          max={96}
          step={2}
          leftHint="Strict"
          rightHint="Grippy"
          onChange={(v) => onChange({ pinchExitMm: v })}
        />

        <div className="h-px bg-hairline" />

        <div>
          <span className="eyebrow">Paper</span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                className="chip"
                data-active={background === bg.id}
                onClick={() => onBackground(bg.id)}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-hairline" />

        <button
          type="button"
          className="chip w-full justify-center"
          onClick={onToggleCamera}
        >
          {live ? "Turn camera off" : "Turn camera on"}
        </button>
      </div>
    </PanelShell>
  );
}
