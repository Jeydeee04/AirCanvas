"use client";

import type { RefObject } from "react";
import { Icon } from "../Icon";
import type { EngineStatus } from "../useGestureEngine";

interface CameraPiPProps {
  status: EngineStatus;
  mirror: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  onToggleCamera: () => void;
}

export function CameraPiP({
  status,
  mirror,
  videoRef,
  overlayRef,
  onToggleCamera,
}: CameraPiPProps) {
  const live = status === "running";

  return (
    <div className="panel absolute bottom-5 right-5 z-30 w-[13rem] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="eyebrow text-[0.58rem]">Feed</span>
        <span className="flex items-center gap-1.5">
          <span className="telemetry text-[0.6rem] text-ink-faint">
            {live ? "live" : status === "starting" ? "…" : "off"}
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              live ? "bg-sage anim-pulse" : "bg-ink-faint"
            }`}
          />
        </span>
      </div>

      <div className="relative aspect-video w-full bg-paper-deep">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{
            transform: mirror ? "scaleX(-1)" : "none",
            opacity: live ? 1 : 0,
          }}
        />
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              className="chip"
              data-active
              onClick={onToggleCamera}
            >
              <Icon name="camera" size={13} />
              {status === "denied" || status === "error" ? "Retry" : "Start"}
            </button>
            <span className="text-[0.6rem] text-ink-faint">
              {status === "denied" || status === "error"
                ? "permission needed"
                : "mouse still works"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
