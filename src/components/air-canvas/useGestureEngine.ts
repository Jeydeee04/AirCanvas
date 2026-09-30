import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  GestureRecognizer,
} from "@mediapipe/tasks-vision";
import type { DrawingEngine } from "./drawing-engine";
import { MODEL_PATH, WASM_CDN } from "./constants";

export type EngineStatus = "idle" | "starting" | "running" | "denied" | "error";

export interface GestureSettings {
  /** Flip the camera image horizontally (natural "mirror" movement). */
  mirror: boolean;
  /** Cursor EMA response: low = silky, high = snappy. */
  smoothing: number;
  pinchEnterMm: number;
  pinchExitMm: number;
  showGuide: boolean;
}

export interface GestureFlags {
  drawing: boolean;
  paused: boolean;
}

export interface GestureTelemetry {
  gesture: string | null;
  score: number;
  pinchMm: number;
  fps: number;
  handPresent: boolean;
}

export const DEFAULT_SETTINGS: GestureSettings = {
  mirror: true,
  smoothing: 0.35,
  pinchEnterMm: 48,
  pinchExitMm: 58,
  showGuide: true,
};

const MAX_ANGLE = 80; // deg — forgiving finger orientation
const PALM_HOLD_MS = 250;
const VICTORY_HOLD_MS = 500;
const TELEMETRY_INTERVAL = 200;

interface UseGestureEngineOptions {
  /** Stable DrawingEngine instance — its identity never changes. */
  engine: DrawingEngine;
  settings: GestureSettings;
  /** Fired once per completed Victory hold. */
  onCycleTool?: () => void;
}

function describeError(err: unknown): { status: EngineStatus; message: string } {
  if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
    return {
      status: "error",
      message: "Camera needs a secure context (localhost or HTTPS).",
    };
  }
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return { status: "denied", message: "Camera permission was declined." };
    }
    if (err.name === "NotFoundError") {
      return { status: "error", message: "No camera found on this device." };
    }
    if (err.name === "NotReadableError") {
      return { status: "error", message: "Camera is busy in another app." };
    }
  }
  return {
    status: "error",
    message: err instanceof Error ? err.message : "Could not start the camera.",
  };
}

export function useGestureEngine({
  engine,
  settings,
  onCycleTool,
}: UseGestureEngineOptions) {
  const [status, setStatusState] = useState<EngineStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<GestureFlags>({
    drawing: false,
    paused: false,
  });
  const [telemetry, setTelemetry] = useState<GestureTelemetry>({
    gesture: null,
    score: 0,
    pinchMm: 0,
    fps: 0,
    handPresent: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const mainOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const pipOverlayRef = useRef<HTMLCanvasElement | null>(null);

  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  const statusRef = useRef<EngineStatus>("idle");
  const settingsRef = useRef(settings);
  const cycleRef = useRef(onCycleTool);
  const unmountedRef = useRef(false);
  const startInFlightRef = useRef<Promise<void> | null>(null);

  // Live drawing / gesture state (never re-rendered per frame).
  const smoothedRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  const pausedRef = useRef(false);
  const palmHoldRef = useRef(0);
  const victoryHoldRef = useRef(0);
  const victoryLockRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const lastTsRef = useRef(-1);
  const lastFrameAtRef = useRef(0);
  const fpsRef = useRef({ frames: 0, at: 0, value: 0 });
  const telemetryRef = useRef({ ...telemetry });
  const lastFlushRef = useRef(0);
  const rectRef = useRef<{ rect: DOMRect; at: number } | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    cycleRef.current = onCycleTool;
  }, [onCycleTool]);

  const setStatus = useCallback((next: EngineStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const flushTelemetry = useCallback((force = false) => {
    const now = performance.now();
    if (!force && now - lastFlushRef.current < TELEMETRY_INTERVAL) return;
    lastFlushRef.current = now;
    const next = telemetryRef.current;
    setTelemetry((prev) =>
      prev.gesture === next.gesture &&
      prev.score === next.score &&
      prev.pinchMm === next.pinchMm &&
      prev.fps === next.fps &&
      prev.handPresent === next.handPresent
        ? prev
        : { ...next },
    );
  }, []);

  const positionCursor = useCallback((x: number, y: number) => {
    const el = cursorRef.current;
    const host = mainOverlayRef.current;
    if (!el || !host) return;
    const now = performance.now();
    if (!rectRef.current || now - rectRef.current.at > 400) {
      rectRef.current = { rect: host.getBoundingClientRect(), at: now };
    }
    const { rect } = rectRef.current;
    el.style.transform = `translate3d(${x * rect.width}px, ${
      y * rect.height
    }px, 0) translate(-50%, -50%)`;
    el.style.opacity = "1";
  }, []);

  const hideCursor = useCallback(() => {
    const el = cursorRef.current;
    if (el) el.style.opacity = "0";
  }, []);

  const drawSkeleton = useCallback(
    (canvas: HTMLCanvasElement | null, landmarks: { x: number; y: number }[], alpha: number) => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (alpha <= 0) return; // guide switched off — cleared, nothing to draw

      const { mirror } = settingsRef.current;
      const px = (i: number) => {
        const p = landmarks[i];
        // Same flip as the mirrored <video> (scaleX(-1)), so the skeleton
        // stays registered to the hand in the preview.
        return { x: (mirror ? 1 - p.x : p.x) * w, y: p.y * h };
      };

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(28, 26, 23, ${alpha})`;
      ctx.fillStyle = `rgba(28, 26, 23, ${alpha + 0.18})`;

      for (const c of GestureRecognizer.HAND_CONNECTIONS) {
        const a = px(c.start);
        const b = px(c.end);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let i = 0; i < landmarks.length; i++) {
        const p = px(i);
        const tip = i === 4 || i === 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, tip ? 3 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [],
  );

  const clearOverlays = useCallback(() => {
    for (const canvas of [mainOverlayRef.current, pipOverlayRef.current]) {
      if (!canvas) continue;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const resetTransient = useCallback(() => {
    drawingRef.current = false;
    pausedRef.current = false;
    palmHoldRef.current = 0;
    victoryHoldRef.current = 0;
    victoryLockRef.current = false;
    smoothedRef.current = null;
    telemetryRef.current = { ...telemetryRef.current, gesture: null, score: 0, handPresent: false, fps: 0 };
    hideCursor();
    clearOverlays();
    setFlags({ drawing: false, paused: false });
    flushTelemetry(true);
  }, [clearOverlays, flushTelemetry, hideCursor]);

  /* ------------------------------------------------------- main loop */

  // Stable indirection: the loop reschedules itself through this ref, so the
  // callback never has to reference its own binding before declaration.
  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => tickRef.current());
    if (statusRef.current !== "running") return;

    const recognizer = recognizerRef.current;
    const video = videoRef.current;
    if (!recognizer || !video || video.readyState < 2 || video.videoWidth === 0) return;
    if (video.currentTime === lastVideoTimeRef.current) return;

    lastVideoTimeRef.current = video.currentTime;
    let now = performance.now();
    if (now <= lastTsRef.current) now = lastTsRef.current + 1;
    const dt = Math.min(now - (lastFrameAtRef.current || now), 100);
    lastTsRef.current = now;
    lastFrameAtRef.current = now;

    // FPS meter
    const fps = fpsRef.current;
    fps.frames += 1;
    if (now - fps.at > 500) {
      fps.value = Math.round((fps.frames * 1000) / (now - fps.at));
      fps.frames = 0;
      fps.at = now;
    }

    let result;
    try {
      result = recognizer.recognizeForVideo(video, now);
    } catch {
      return; // transient inference hiccup — skip the frame
    }

    const landmarks = result.landmarks?.[0];
    const world = result.worldLandmarks?.[0];
    const tele = telemetryRef.current;
    tele.fps = fps.value;

    const hasHand = !!landmarks && !!world && landmarks.length >= 9 && world.length >= 9;

    if (!hasHand) {
      if (drawingRef.current) {
        engine.endStroke();
        drawingRef.current = false;
        setFlags((f) => (f.drawing ? { ...f, drawing: false } : f));
      }
      if (pausedRef.current) {
        pausedRef.current = false;
        setFlags((f) => (f.paused ? { ...f, paused: false } : f));
      }
      smoothedRef.current = null;
      palmHoldRef.current = 0;
      victoryHoldRef.current = 0;
      victoryLockRef.current = false;
      hideCursor();
      clearOverlays();
      if (tele.handPresent || tele.gesture) {
        tele.handPresent = false;
        tele.gesture = null;
        tele.score = 0;
        tele.pinchMm = 0;
        flushTelemetry();
      }
      return;
    }

    const { mirror, smoothing, pinchEnterMm, pinchExitMm, showGuide } = settingsRef.current;

    /* --- cursor from index tip, adaptive EMA smoothing --- */
    // Mirror mode (default) flips X so the cursor follows the hand the same
    // way the mirrored PiP preview shows it: hand right → cursor right.
    const rawX = mirror ? 1 - landmarks[8].x : landmarks[8].x;
    const rawY = landmarks[8].y;
    const smoothed = smoothedRef.current;
    if (!smoothed) {
      smoothedRef.current = { x: rawX, y: rawY };
    } else {
      const dx = rawX - smoothed.x;
      const dy = rawY - smoothed.y;
      const speed = Math.hypot(dx, dy);
      const alpha = Math.min(Math.max(speed * 3.2, smoothing), 0.85);
      smoothed.x += dx * alpha;
      smoothed.y += dy * alpha;
    }
    const { x: cursorX, y: cursorY } = smoothedRef.current!;
    positionCursor(cursorX, cursorY);

    /* --- skeleton guide --- */
    drawSkeleton(mainOverlayRef.current, landmarks, showGuide ? 0.16 : 0);
    drawSkeleton(pipOverlayRef.current, landmarks, 0.5);

    /* --- classified gesture (score-gated) --- */
    const category = result.gestures?.[0]?.[0];
    const gestureName =
      category && category.categoryName !== "None" && category.score >= 0.55
        ? category.categoryName
        : null;

    tele.handPresent = true;
    tele.gesture = gestureName;
    tele.score = category ? category.score : 0;

    /* --- pinch geometry (3D, millimetres) --- */
    const thumb = world[4];
    const index = world[8];
    const distMm =
      Math.hypot(index.x - thumb.x, index.y - thumb.y, index.z - thumb.z) * 1000;
    tele.pinchMm = Math.round(distMm);

    const mcp = world[5];
    const v1 = { x: index.x - mcp.x, y: index.y - mcp.y, z: index.z - mcp.z };
    const v2 = { x: thumb.x - mcp.x, y: thumb.y - mcp.y, z: thumb.z - mcp.z };
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.hypot(v1.x, v1.y, v1.z);
    const mag2 = Math.hypot(v2.x, v2.y, v2.z);
    const angleDeg =
      (Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2 || 1)))) * 180) /
      Math.PI;

    /* --- open-palm pause (hysteresis) --- */
    const isPalm = gestureName === "Open_Palm";
    palmHoldRef.current = Math.min(
      600,
      Math.max(0, palmHoldRef.current + (isPalm ? dt : -dt * 1.8)),
    );
    const nowPaused = palmHoldRef.current >= PALM_HOLD_MS;
    if (nowPaused !== pausedRef.current) {
      pausedRef.current = nowPaused;
      setFlags((f) => (f.paused === nowPaused ? f : { ...f, paused: nowPaused }));
    }

    /* --- draw / stop drawing --- */
    if (drawingRef.current) {
      if (nowPaused) {
        engine.endStroke();
        drawingRef.current = false;
        setFlags((f) => (f.drawing ? { ...f, drawing: false } : f));
      } else if (distMm < pinchExitMm && angleDeg < MAX_ANGLE) {
        engine.addPoint(cursorX, cursorY);
      } else {
        engine.endStroke();
        drawingRef.current = false;
        setFlags((f) => (f.drawing ? { ...f, drawing: false } : f));
      }
    } else if (!nowPaused) {
      const shouldStart = distMm < pinchEnterMm && angleDeg < MAX_ANGLE;
      if (shouldStart) {
        engine.beginStroke(cursorX, cursorY);
        drawingRef.current = true;
        setFlags((f) => (f.drawing ? f : { ...f, drawing: true }));
      }
    }

    /* --- victory → cycle tool (held, locked out until released) --- */
    if (!drawingRef.current) {
      const isVictory = gestureName === "Victory";
      victoryHoldRef.current = Math.min(
        900,
        Math.max(0, victoryHoldRef.current + (isVictory ? dt : -dt * 2)),
      );
      if (victoryHoldRef.current >= VICTORY_HOLD_MS && !victoryLockRef.current) {
        victoryLockRef.current = true;
        cycleRef.current?.();
      }
      if (victoryHoldRef.current <= 0) victoryLockRef.current = false;
    }

    flushTelemetry();
  }, [
    clearOverlays,
    drawSkeleton,
    engine,
    flushTelemetry,
    hideCursor,
    positionCursor,
  ]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  /* ------------------------------------------------------- lifecycle */

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setError(null);
    resetTransient();
    setStatus("idle");
  }, [resetTransient, setStatus]);

  const doStart = useCallback(async () => {
    if (statusRef.current === "starting" || statusRef.current === "running") return;
    setError(null);
    setStatus("starting");

    try {
      if (!recognizerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const build = (delegate: "GPU" | "CPU") => ({
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: "VIDEO" as const,
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          cannedGesturesClassifierOptions: { scoreThreshold: 0.6 },
        });
        try {
          recognizerRef.current = await GestureRecognizer.createFromOptions(
            vision,
            build("GPU"),
          );
        } catch {
          recognizerRef.current = await GestureRecognizer.createFromOptions(
            vision,
            build("CPU"),
          );
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: { ideal: 60 } },
        audio: false,
      });

      if (unmountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Camera preview element is missing.");
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      lastVideoTimeRef.current = -1;
      lastTsRef.current = -1;
      lastFrameAtRef.current = 0;
      fpsRef.current = { frames: 0, at: performance.now(), value: 0 };
      setStatus("running");
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err) {
      const { status: nextStatus, message } = describeError(err);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setError(message);
      setStatus(nextStatus);
    }
  }, [setStatus]);

  /** Deduped so double-invoked effects or rapid clicks share one attempt. */
  const start = useCallback(() => {
    if (startInFlightRef.current) return startInFlightRef.current;
    const attempt = doStart().finally(() => {
      startInFlightRef.current = null;
    });
    startInFlightRef.current = attempt;
    return attempt;
  }, [doStart]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognizerRef.current?.close();
      recognizerRef.current = null;
    };
  }, []);

  return {
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
  };
}
