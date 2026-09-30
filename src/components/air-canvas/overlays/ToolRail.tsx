"use client";

import { Icon, type IconName } from "../Icon";
import { BRUSH_SIZES, PALETTE, TOOLS } from "../constants";
import type { HistoryState } from "../drawing-engine";

interface ToolRailProps {
  tool: string;
  color: string;
  brushPx: number;
  history: HistoryState;
  confirmClear: boolean;
  onTool: (tool: (typeof TOOLS)[number]["id"]) => void;
  onColor: (hex: string) => void;
  onBrush: (px: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
}

export function ToolRail({
  tool,
  color,
  brushPx,
  history,
  confirmClear,
  onTool,
  onColor,
  onBrush,
  onUndo,
  onRedo,
  onClear,
  onExport,
}: ToolRailProps) {
  const activeSwatch =
    PALETTE.find((p) => p.hex.toLowerCase() === color.toLowerCase())?.name ?? null;

  return (
    <div className="panel thin-scroll absolute left-5 top-1/2 z-30 flex max-h-[calc(100dvh-9rem)] w-[3.75rem] -translate-y-1/2 flex-col items-center px-2 py-3">
      {/* Tools */}
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="icon-btn h-[2.9rem] w-[2.9rem] flex-col gap-[3px]"
          data-active={tool === t.id}
          aria-pressed={tool === t.id}
          title={`${t.label} (${t.shortcut})`}
          onClick={() => onTool(t.id)}
        >
          <Icon name={t.icon as IconName} size={16} />
          <span className="text-[0.5rem] font-semibold uppercase tracking-[0.12em]">
            {t.label}
          </span>
        </button>
      ))}

      <div className="rail-divider" />

      {/* Brush sizes */}
      <div className="flex flex-col items-center gap-1.5">
        {BRUSH_SIZES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="icon-btn h-7 w-7"
            data-active={brushPx === s.px}
            aria-pressed={brushPx === s.px}
            title={`${s.label} · ${s.px}px`}
            onClick={() => onBrush(s.px)}
          >
            <span
              className="block rounded-full bg-current"
              style={{
                width: Math.max(4, Math.min(14, s.px)),
                height: Math.max(4, Math.min(14, s.px)),
              }}
            />
          </button>
        ))}
      </div>

      <div className="rail-divider" />

      {/* Palette */}
      <div className="grid grid-cols-2 gap-1.5">
        {PALETTE.map((p, i) => (
          <button
            key={p.hex}
            type="button"
            className="swatch"
            data-active={color === p.hex}
            aria-pressed={color === p.hex}
            title={`${p.name} (${i + 1})`}
            style={{ backgroundColor: p.hex }}
            onClick={() => onColor(p.hex)}
          />
        ))}
        <label
          className="swatch cursor-pointer"
          data-active={activeSwatch === null}
          title="Custom colour"
          style={{
            background:
              "conic-gradient(#c2603c, #d6a04a, #7c8b6b, #4a6072, #7a4a63, #c2603c)",
          }}
        >
          <input
            type="color"
            value={color}
            onChange={(e) => onColor(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Custom colour"
          />
        </label>
      </div>

      <div className="rail-divider" />

      {/* History + output */}
      <div className="grid w-full grid-cols-2 justify-center justify-items-center gap-1">
        <button
          type="button"
          className="icon-btn h-8 w-8"
          disabled={!history.canUndo}
          title="Undo (⌘Z)"
          aria-label="Undo"
          onClick={onUndo}
        >
          <Icon name="undo" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn h-8 w-8"
          disabled={!history.canRedo}
          title="Redo (⇧⌘Z)"
          aria-label="Redo"
          onClick={onRedo}
        >
          <Icon name="redo" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn h-8 w-8"
          data-active={confirmClear}
          title="Clear canvas (C)"
          aria-label="Clear canvas"
          onClick={onClear}
          style={confirmClear ? { color: "#c2603c" } : undefined}
        >
          <Icon name="trash" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn h-8 w-8"
          title="Save PNG (S)"
          aria-label="Save PNG"
          onClick={onExport}
        >
          <Icon name="download" size={16} />
        </button>
      </div>
    </div>
  );
}
