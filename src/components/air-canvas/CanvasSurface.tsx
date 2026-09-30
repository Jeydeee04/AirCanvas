"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DrawingEngine, Tool } from "./drawing-engine";
import type { EngineStatus } from "./useGestureEngine";

interface CanvasSurfaceProps {
  engine: DrawingEngine;
  overlayRef: React.RefObject<HTMLCanvasElement | null>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  status: EngineStatus;
  tool: Tool;
  color: string;
  brushPx: number;
  drawing: boolean;
  paused: boolean;
}

const CROP = "absolute h-4 w-4 border-hairline-strong";

export function CanvasSurface({
  engine,
  overlayRef,
  cursorRef,
  status,
  tool,
  color,
  brushPx,
  drawing,
  paused,
}: CanvasSurfaceProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const drawRef = useRef<HTMLCanvasElement | null>(null);
  const pointerDownRef = useRef(false);
  const pointerRectRef = useRef<DOMRect | null>(null);

  /* --- engine ↔ element wiring + responsive backing store --- */
  useEffect(() => {
    const canvas = drawRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    engine.attach(canvas);

    const apply = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      engine.resize(rect.width, rect.height, dpr);
      pointerRectRef.current = null;
    };
    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(host);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [engine]);

  const moveCursor = useCallback(
    (x: number, y: number) => {
      const el = cursorRef.current;
      const rect = pointerRectRef.current;
      if (!el || !rect) return;
      el.style.transform = `translate3d(${x * rect.width}px, ${
        y * rect.height
      }px, 0) translate(-50%, -50%)`;
      el.style.opacity = "1";
    },
    [cursorRef],
  );

  const toNorm = useCallback((e: React.PointerEvent) => {
    const host = hostRef.current;
    if (!host) return null;
    if (!pointerRectRef.current) {
      pointerRectRef.current = host.getBoundingClientRect();
    }
    const rect = pointerRectRef.current;
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = toNorm(e);
    if (!p) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerDownRef.current = true;
    pointerRectRef.current = e.currentTarget.getBoundingClientRect();
    engine.beginStroke(p.x, p.y);
    if (status !== "running") moveCursor(p.x, p.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const p = toNorm(e);
    if (!p) return;
    if (pointerDownRef.current) {
      engine.addPoint(p.x, p.y);
    }
    // When the camera owns the cursor, the hand drives it — not the mouse.
    if (status !== "running") moveCursor(p.x, p.y);
  };

  const endPointer = () => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    engine.endStroke();
  };

  /* --- cursor ring visuals (state changes only, never per frame) --- */
  const cursorColor = tool === "eraser" ? "#1c1a17" : color;
  const cursorSize =
    tool === "eraser"
      ? Math.max(24, brushPx * 2.4)
      : drawing
        ? brushPx + 12
        : 22;

  return (
    <div
      ref={hostRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
      className="absolute inset-0 z-0 touch-none select-none [cursor:crosshair]"
    >
      {/* the artwork */}
      <canvas ref={drawRef} className="absolute inset-0 h-full w-full" />

      {/* paper grain over the ink */}
      <div className="grain pointer-events-none absolute inset-0 z-10" />

      {/* hand skeleton echo */}
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />

      {/* registration / crop marks */}
      <div className={`pointer-events-none absolute left-5 top-5 z-20 border-l border-t ${CROP}`} />
      <div className={`pointer-events-none absolute right-5 top-5 z-20 border-r border-t ${CROP}`} />
      <div className={`pointer-events-none absolute bottom-5 left-5 z-20 border-b border-l ${CROP}`} />
      <div className={`pointer-events-none absolute bottom-5 right-5 z-20 border-b border-r ${CROP}`} />

      {/* air cursor */}
      <div
        ref={cursorRef}
        className="pointer-events-none absolute left-0 top-0 z-30 opacity-0"
        style={{ transition: "opacity 180ms ease" }}
      >
        <div
          className="rounded-full"
          style={{
            width: cursorSize,
            height: cursorSize,
            // Longhand only — React 19 warns when `border` and `borderColor`
            // (shorthand + longhand) coexist in one style object.
            borderStyle: paused ? "dashed" : "solid",
            borderWidth: `${drawing || paused ? 2 : 1.5}px`,
            borderColor: paused ? "rgba(28,26,23,0.55)" : cursorColor,
            background: drawing ? `${cursorColor}26` : "transparent",
            boxShadow: drawing
              ? "0 0 0 1px rgba(255,255,255,0.55), 0 2px 10px -2px rgba(28,26,23,0.4)"
              : "0 1px 6px -1px rgba(28,26,23,0.35)",
            transition: "width 140ms ease, height 140ms ease, border-color 140ms ease",
          }}
        />
      </div>
    </div>
  );
}
