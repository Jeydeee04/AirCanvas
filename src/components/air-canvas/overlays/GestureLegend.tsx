"use client";

import { Icon } from "../Icon";
import { GESTURE_LEGEND } from "../constants";
import type { GestureFlags, GestureTelemetry } from "../useGestureEngine";

interface GestureLegendProps {
  flags: GestureFlags;
  telemetry: GestureTelemetry;
}

export function GestureLegend({ flags, telemetry }: GestureLegendProps) {
  const isActive = (category: string | null): boolean => {
    if (category === null) return flags.drawing;
    if (category === "Open_Palm") return flags.paused;
    return telemetry.gesture === category;
  };

  return (
    <div className="pointer-events-none absolute bottom-5 left-5 z-30 flex max-w-[calc(100vw-2.5rem)] flex-wrap gap-2">
      {GESTURE_LEGEND.map((entry) => (
        <div
          key={entry.gesture}
          className="chip"
          data-active={isActive(entry.category)}
        >
          <Icon name={entry.icon} size={13} />
          <span className="font-semibold">{entry.gesture}</span>
          <span className="opacity-55">{entry.action}</span>
        </div>
      ))}
    </div>
  );
}
