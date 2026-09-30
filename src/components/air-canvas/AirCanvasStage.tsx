"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasSurface } from "./CanvasSurface";
import { BRUSH_SIZES, PALETTE, STORAGE_KEYS, TOOLS } from "./constants";
import type { Background, HistoryState, Tool } from "./drawing-engine";
import { DrawingEngine } from "./drawing-engine";
import { DEFAULT_SETTINGS, useGestureEngine } from "./useGestureEngine";
import { CameraPiP } from "./overlays/CameraPiP";
import { GestureLegend } from "./overlays/GestureLegend";
import { HelpPanel } from "./overlays/HelpPanel";
import { OnboardingOverlay } from "./overlays/OnboardingOverlay";
import { Placard } from "./overlays/Placard";
import { SettingsPanel } from "./overlays/SettingsPanel";
import { StatusStrip } from "./overlays/StatusStrip";
import { ToolRail } from "./overlays/ToolRail";
import { Toasts, type Toast } from "./overlays/Toasts";

export default function AirCanvasStage() {
  /* --------------------------------------------------- drawing state */
  // Lazy state initializer: created once, identity stable for the app's life.
  const [engine] = useState(() => new DrawingEngine());

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(PALETTE[1].hex);
  const [brushPx, setBrushPx] = useState<number>(BRUSH_SIZES[1].px);
  const [background, setBackground] = useState<Background>("paper");
  const [history, setHistory] = useState<HistoryState>({
    count: 0,
    canUndo: false,
    canRedo: false,
  });

  /* --------------------------------------------------- app state */
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [panel, setPanel] = useState<"settings" | "help" | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [onboarding, setOnboarding] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const toastId = useRef(0);
  const clearTimer = useRef(0);
  const toolRef = useRef(tool);
  const lastErrorRef = useRef<string | null>(null);

  const pushToast = useCallback((msg: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg }]);
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      1900,
    );
  }, []);

  /* --------------------------------------------------- engine wiring */
  useEffect(() => {
    engine.setOnChange((state) => setHistory(state));
    return () => {
      engine.setOnChange(null);
    };
  }, [engine]);

  useEffect(() => {
    engine.setTool(tool);
    engine.setColor(color);
    engine.setSize(brushPx);
    engine.setBackground(background);
  }, [engine, tool, color, brushPx, background]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const cycleTool = useCallback(() => {
    const index = TOOLS.findIndex((t) => t.id === toolRef.current);
    const next = TOOLS[(index + 1) % TOOLS.length];
    setTool(next.id);
    pushToast(`Victory → ${next.label}`);
  }, [pushToast]);

  const {
    status,
    error,
    flags,
    telemetry,
    start,
    stop,
    videoRef,
    cursorRef,
    mainOverlayRef,
    pipOverlayRef,
  } = useGestureEngine({ engine, settings, onCycleTool: cycleTool });

  /* --------------------------------------------------- first run */
  useEffect(() => {
    let seen = false;
    let cam = false;
    try {
      seen = localStorage.getItem(STORAGE_KEYS.onboarded) === "1";
      cam = localStorage.getItem(STORAGE_KEYS.camera) === "1";
    } catch {
      /* private mode — just show the guide */
    }
    if (!seen) {
      // Deferred a frame: keeps SSR markup identical, avoids a sync re-render.
      const id = requestAnimationFrame(() => setOnboarding(true));
      return () => cancelAnimationFrame(id);
    }
    if (cam) void start();
  }, [start]);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      pushToast(error);
    }
  }, [error, pushToast]);

  /* --------------------------------------------------- commands */
  const persist = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  };

  const toggleCamera = useCallback(() => {
    if (status === "running" || status === "starting") {
      stop();
      persist(STORAGE_KEYS.camera, "0");
      pushToast("Camera off — mouse still draws");
    } else {
      persist(STORAGE_KEYS.camera, "1");
      void start();
    }
  }, [start, stop, status, pushToast]);

  const finishOnboarding = (enableCamera: boolean) => {
    setOnboarding(false);
    persist(STORAGE_KEYS.onboarded, "1");
    persist(STORAGE_KEYS.camera, enableCamera ? "1" : "0");
    if (enableCamera) {
      void start();
    } else {
      pushToast("Mouse mode — camera can start any time");
    }
  };

  const requestClear = useCallback(() => {
    if (confirmClear) {
      window.clearTimeout(clearTimer.current);
      setConfirmClear(false);
      engine.clear();
      pushToast("Canvas cleared");
    } else {
      setConfirmClear(true);
      pushToast("Press again to clear");
      clearTimer.current = window.setTimeout(() => setConfirmClear(false), 2000);
    }
  }, [confirmClear, engine, pushToast]);

  const exportPNG = useCallback(() => {
    engine.exportPNG();
    pushToast("Saved as PNG");
  }, [engine, pushToast]);

  /* --------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) engine.redo();
        else engine.undo();
        return;
      }
      if (meta) return;

      const key = e.key.toLowerCase();
      const swatch = Number(key);

      if (swatch >= 1 && swatch <= PALETTE.length) {
        setColor(PALETTE[swatch - 1].hex);
        pushToast(PALETTE[swatch - 1].name);
        return;
      }

      switch (key) {
        case "b":
          setTool("pen");
          pushToast("Pen");
          break;
        case "h":
          setTool("highlighter");
          pushToast("Marker");
          break;
        case "e":
          setTool("eraser");
          pushToast("Eraser");
          break;
        case "s":
          e.preventDefault();
          exportPNG();
          break;
        case "c":
          requestClear();
          break;
        case "?":
          setPanel((p) => (p === "help" ? null : "help"));
          break;
        case "escape":
          setPanel(null);
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, exportPNG, pushToast, requestClear]);

  /* --------------------------------------------------- derived */
  const activeTool = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];
  const colorName =
    PALETTE.find((p) => p.hex.toLowerCase() === color.toLowerCase())?.name ??
    "Custom";

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-paper text-ink">
      <CanvasSurface
        engine={engine}
        overlayRef={mainOverlayRef}
        cursorRef={cursorRef}
        status={status}
        tool={tool}
        color={color}
        brushPx={brushPx}
        drawing={flags.drawing}
        paused={flags.paused}
      />

      <StatusStrip
        status={status}
        error={error}
        flags={flags}
        telemetry={telemetry}
        toolLabel={activeTool.label}
        panel={panel}
        onTogglePanel={(p) => setPanel((cur) => (cur === p ? null : p))}
        onToggleCamera={toggleCamera}
      />

      <ToolRail
        tool={tool}
        color={color}
        brushPx={brushPx}
        history={history}
        confirmClear={confirmClear}
        onTool={(t) => setTool(t)}
        onColor={(hex) => setColor(hex)}
        onBrush={(px) => setBrushPx(px)}
        onUndo={() => engine.undo()}
        onRedo={() => engine.redo()}
        onClear={requestClear}
        onExport={exportPNG}
      />

      <GestureLegend flags={flags} telemetry={telemetry} />

      {panel === null && (
        <Placard
          toolLabel={activeTool.label}
          colorName={colorName}
          colorHex={color}
          strokes={history.count}
          elapsed={elapsed}
          gesture={telemetry.gesture}
        />
      )}

      <CameraPiP
        status={status}
        mirror={settings.mirror}
        videoRef={videoRef}
        overlayRef={pipOverlayRef}
        onToggleCamera={toggleCamera}
      />

      <SettingsPanel
        open={panel === "settings"}
        onClose={() => setPanel(null)}
        settings={settings}
        background={background}
        status={status}
        onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        onBackground={setBackground}
        onToggleCamera={toggleCamera}
      />

      <HelpPanel open={panel === "help"} onClose={() => setPanel(null)} />

      <OnboardingOverlay
        open={onboarding}
        busy={status === "starting"}
        onEnableCamera={() => finishOnboarding(true)}
        onDismiss={() => finishOnboarding(false)}
      />

      <Toasts toasts={toasts} />
    </main>
  );
}
