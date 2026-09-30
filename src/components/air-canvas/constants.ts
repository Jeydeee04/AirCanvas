import type { Background, Tool } from "./drawing-engine";

/** Curated gallery palette — no raw color input in the rail, only here. */
export const PALETTE = [
  { name: "Ink", hex: "#1c1a17" },
  { name: "Terracotta", hex: "#c2603c" },
  { name: "Ochre", hex: "#d6a04a" },
  { name: "Sage", hex: "#7c8b6b" },
  { name: "Slate", hex: "#4a6072" },
  { name: "Plum", hex: "#7a4a63" },
] as const;

export const TOOLS: { id: Tool; label: string; shortcut: string; icon: string }[] = [
  { id: "pen", label: "Pen", shortcut: "B", icon: "pen" },
  { id: "highlighter", label: "Marker", shortcut: "H", icon: "marker" },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: "eraser" },
];

export const BRUSH_SIZES = [
  { id: "s", label: "Fine", px: 3 },
  { id: "m", label: "Medium", px: 7 },
  { id: "l", label: "Bold", px: 15 },
] as const;

export const BACKGROUNDS: { id: Background; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "grid", label: "Grid" },
  { id: "dot", label: "Dot" },
  { id: "white", label: "Plain" },
];

/** The gesture vocabulary this canvas understands. */
export const GESTURE_LEGEND = [
  {
    icon: "draw" as const,
    gesture: "Pinch",
    detail: "Thumb + index",
    action: "Draw",
    category: null as string | null,
  },
  {
    icon: "cycle" as const,
    gesture: "Victory",
    detail: "Hold ~0.5s",
    action: "Switch tool",
    category: "Victory",
  },
  {
    icon: "pause" as const,
    gesture: "Open palm",
    detail: "Face the camera",
    action: "Pause",
    category: "Open_Palm",
  },
];

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "B", label: "Pen" },
  { keys: "H", label: "Marker" },
  { keys: "E", label: "Eraser" },
  { keys: "⌘ Z", label: "Undo" },
  { keys: "⇧ ⌘ Z", label: "Redo" },
  { keys: "S", label: "Save PNG" },
  { keys: "1 – 6", label: "Swatches" },
  { keys: "Esc", label: "Close panels" },
];

/** Pinned to match the installed @mediapipe/tasks-vision version. */
export const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

export const MODEL_PATH = "/models/gesture_recognizer.task";

export const STORAGE_KEYS = {
  onboarded: "aircanvas.onboarded",
  camera: "aircanvas.camera",
} as const;
