/**
 * DrawingEngine — a stroke-buffer canvas renderer.
 *
 * All artwork is stored as normalized strokes rather than burnt pixels, which
 * gives us undo/redo, tool changes, responsive resizing and PNG export almost
 * for free. It knows nothing about React or MediaPipe.
 */

export type Tool = "pen" | "highlighter" | "eraser";
export type Background = "paper" | "grid" | "dot" | "white";

interface Point {
  /** 0..1 across canvas width */
  x: number;
  /** 0..1 across canvas height */
  y: number;
}

interface Stroke {
  id: number;
  tool: Exclude<Tool, "eraser">;
  color: string;
  /** line width normalized against canvas width */
  size: number;
  points: Point[];
  /**
   * Cached normalised-space bounds. Points never mutate once a stroke is
   * committed, so this can be computed lazily and reused by the eraser.
   */
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

type HistoryAction =
  | { kind: "add"; stroke: Stroke }
  /** One continuous eraser gesture: full stroke array before and after. */
  | { kind: "erase"; before: Stroke[]; after: Stroke[] }
  | { kind: "clear"; strokes: Stroke[] };

export interface HistoryState {
  count: number;
  canUndo: boolean;
  canRedo: boolean;
}

const COLORS = {
  paper: "#f4efe6",
  grid: "rgba(28, 26, 23, 0.07)",
  dot: "rgba(28, 26, 23, 0.18)",
  white: "#ffffff",
};

export class DrawingEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private strokes: Stroke[] = [];
  private history: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];

  private active: Stroke | null = null;
  private erasing = false;
  /** Stroke array captured when an eraser gesture starts (for undo). */
  private sessionBefore: Stroke[] | null = null;
  /** Previous eraser position (normalised), used to interpolate the path. */
  private lastErase: Point | null = null;

  private tool: Tool = "pen";
  private color = "#1c1a17";
  private sizePx = 7;
  private background: Background = "paper";

  private cssWidth = 1;
  private cssHeight = 1;
  private dpr = 1;
  private nextId = 1;

  onChange: ((state: HistoryState) => void) | null = null;

  /** Wired by React through a method call — never assigned as a property. */
  setOnChange(handler: ((state: HistoryState) => void) | null): void {
    this.onChange = handler;
  }

  /* ---------------------------------------------------- lifecycle */

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.redraw();
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    if (!this.canvas) return;
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      // Assigning width/height resets the context, transform included.
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.dpr = dpr;
    // Keep a persistent DPR transform so live segments land where redraws do.
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  /* ---------------------------------------------------- settings */

  setTool(tool: Tool): void {
    if (this.tool === tool) return;
    if (this.active || this.erasing) this.endStroke();
    this.tool = tool;
  }

  setColor(color: string): void {
    this.color = color;
  }

  setSize(sizePx: number): void {
    this.sizePx = sizePx;
  }

  setBackground(background: Background): void {
    if (this.background === background) return;
    this.background = background;
    this.redraw();
  }

  /* ---------------------------------------------------- strokes */

  beginStroke(x: number, y: number): void {
    if (!this.ctx) return;

    if (this.tool === "eraser") {
      if (this.active) this.endStroke();
      if (!this.erasing) {
        this.erasing = true;
        this.sessionBefore = [...this.strokes];
      }
      this.lastErase = { x, y };
      this.eraseAt(x, y);
      return;
    }

    if (this.active) this.endStroke();

    const stroke: Stroke = {
      id: this.nextId++,
      tool: this.tool,
      color: this.color,
      size: this.sizePx / this.cssWidth,
      points: [{ x, y }],
    };
    this.strokes.push(stroke);
    this.active = stroke;
    this.redoStack = [];
    this.emit();
  }

  addPoint(x: number, y: number): void {
    if (!this.ctx) return;

    if (this.erasing) {
      // Sweep the whole path since the last sample — one frame of a fast hand
      // can travel many eraser-widths, and we must not leave stripes.
      const from = this.lastErase;
      if (from) this.eraseBetween(from, { x, y });
      else this.eraseAt(x, y);
      this.lastErase = { x, y };
      return;
    }

    const stroke = this.active;
    if (!stroke) return;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push({ x, y });
    this.drawSegment(stroke, prev, { x, y });
  }

  endStroke(): void {
    if (this.erasing) {
      this.erasing = false;
      this.lastErase = null;
      const before = this.sessionBefore;
      this.sessionBefore = null;
      if (before && this.stateChanged(before)) {
        this.history.push({ kind: "erase", before, after: [...this.strokes] });
        this.redoStack = [];
        this.emit();
      }
      return;
    }

    const stroke = this.active;
    if (!stroke) return;
    this.active = null;

    if (stroke.points.length === 1) {
      // A tap: draw a dot so single clicks still leave a mark.
      const p = stroke.points[0];
      this.drawSegment(stroke, p, p);
    }

    this.history.push({ kind: "add", stroke });
    this.emit();
  }

  /* ---------------------------------------------------- history */

  undo(): void {
    // Commit a live eraser gesture first so history ordering stays sane.
    if (this.active || this.erasing) this.endStroke();
    const action = this.history.pop();
    if (!action) return;

    switch (action.kind) {
      case "add":
        this.strokes = this.strokes.filter((s) => s !== action.stroke);
        break;
      case "erase":
        this.strokes = [...action.before];
        break;
      case "clear":
        this.strokes = [...action.strokes];
        break;
    }

    this.redoStack.push(action);
    this.redraw();
    this.emit();
  }

  redo(): void {
    if (this.active || this.erasing) this.endStroke();
    const action = this.redoStack.pop();
    if (!action) return;

    switch (action.kind) {
      case "add":
        this.strokes.push(action.stroke);
        break;
      case "erase":
        this.strokes = [...action.after];
        break;
      case "clear":
        this.strokes = [];
        break;
    }

    this.history.push(action);
    this.redraw();
    this.emit();
  }

  clear(): void {
    if (this.active || this.erasing) this.endStroke();
    if (this.strokes.length === 0) return;
    this.history.push({ kind: "clear", strokes: [...this.strokes] });
    this.redoStack = [];
    this.strokes = [];
    this.active = null;
    this.redraw();
    this.emit();
  }

  /* ---------------------------------------------------- output */

  exportPNG(filename?: string): void {
    if (!this.canvas) return;
    const name =
      filename ??
      `air-canvas-${new Date().toISOString().slice(0, 10)}.png`;
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }

  getStrokeCount(): number {
    return this.strokes.length;
  }

  /* ---------------------------------------------------- internals */

  private stateChanged(before: Stroke[]): boolean {
    if (before.length !== this.strokes.length) return true;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== this.strokes[i]) return true;
    }
    return false;
  }

  /** Base eraser radius in CSS px — follows the selected brush size. */
  private eraserRadius(): number {
    return Math.max(12, this.sizePx * 1.2);
  }

  private eraseAt(x: number, y: number): void {
    if (this.applyErase(x, y)) {
      this.redraw();
      this.emit();
    }
  }

  /**
   * Sweeps the eraser along the segment between two positions in steps of at
   * most ~0.6 radii, so fast drags cut a continuous channel instead of a row
   * of separate dots. Redraws once at the end.
   */
  private eraseBetween(from: Point, to: Point): void {
    const dx = (to.x - from.x) * this.cssWidth;
    const dy = (to.y - from.y) * this.cssHeight;
    const step = Math.max(6, this.eraserRadius() * 0.6);
    const steps = Math.max(1, Math.min(48, Math.ceil(Math.hypot(dx, dy) / step)));

    let changed = false;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      if (this.applyErase(x, y)) changed = true;
    }

    if (changed) {
      this.redraw();
      this.emit();
    }
  }

  /**
   * Nibbling eraser: removes only the points inside the eraser disc and
   * splits each stroke at the cut, leaving untouched parts intact.
   *
   * The disc is widened by each stroke's own half-width (marker lines are
   * 2.6× the brush), so one pass clears a line completely — including its
   * round caps — instead of leaving edge residue. One-point fragments are
   * debris between two cuts and are dropped.
   */
  private applyErase(x: number, y: number): boolean {
    const px = x * this.cssWidth;
    const py = y * this.cssHeight;
    const base = this.eraserRadius();

    const dist2 = (p: Point) => {
      const dx = p.x * this.cssWidth - px;
      const dy = p.y * this.cssHeight - py;
      return dx * dx + dy * dy;
    };

    let changed = false;
    const survivors: Stroke[] = [];

    for (const stroke of this.strokes) {
      // Cheap reject: eraser disc vs the stroke's bounding box.
      const box = this.bboxOf(stroke);
      const half =
        stroke.tool === "highlighter"
          ? this.toPx(stroke.size) * 1.3
          : this.toPx(stroke.size) / 2;
      const r = base + half;
      if (
        px + r < box.x0 * this.cssWidth ||
        px - r > box.x1 * this.cssWidth ||
        py + r < box.y0 * this.cssHeight ||
        py - r > box.y1 * this.cssHeight
      ) {
        survivors.push(stroke);
        continue;
      }

      const r2 = r * r;
      const points = stroke.points;
      let touched = false;
      let run: Point[] = [];
      const segments: Point[][] = [];
      let prev: Point | null = null;

      const closeRun = () => {
        if (run.length > 0) segments.push(run);
        run = [];
      };

      for (const p of points) {
        const hit = dist2(p) <= r2;

        // Sparse samples: also test the midpoint so the eraser can't slip
        // through a long segment.
        let midHit = false;
        if (prev && !hit) {
          midHit =
            dist2({ x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 }) <= r2;
        }

        if (hit) {
          touched = true;
          closeRun();
        } else if (midHit) {
          // Cut between prev (already kept) and this point.
          touched = true;
          closeRun();
          run = [p];
        } else {
          run.push(p);
        }
        prev = p;
      }
      closeRun();

      // Untouched strokes stay identical (same object, same id).
      if (!touched) {
        survivors.push(stroke);
        continue;
      }

      changed = true;
      for (const segment of segments) {
        // One-point fragments are dots of debris, never useful line.
        if (segment.length >= 2) {
          survivors.push({ ...stroke, id: this.nextId++, points: segment });
        }
      }
    }

    if (changed) this.strokes = survivors;
    return changed;
  }

  private bboxOf(stroke: Stroke): NonNullable<Stroke["bbox"]> {
    if (stroke.bbox) return stroke.bbox;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of stroke.points) {
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
    stroke.bbox = { x0, y0, x1, y1 };
    return stroke.bbox;
  }

  private toPx(size: number): number {
    return size * this.cssWidth;
  }

  private styleFor(stroke: Stroke): void {
    const ctx = this.ctx!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;

    if (stroke.tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = this.toPx(stroke.size) * 2.6;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.lineWidth = this.toPx(stroke.size);
    }
  }

  private resetStyle(): void {
    const ctx = this.ctx!;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  private drawSegment(stroke: Stroke, from: Point, to: Point): void {
    const ctx = this.ctx;
    if (!ctx) return;

    this.styleFor(stroke);
    ctx.beginPath();
    ctx.moveTo(from.x * this.cssWidth, from.y * this.cssHeight);

    if (from === to) {
      // Zero-length stroke: draw a dot manually.
      ctx.arc(
        to.x * this.cssWidth,
        to.y * this.cssHeight,
        Math.max(0.75, this.toPx(stroke.size) / 2),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.lineTo(to.x * this.cssWidth, to.y * this.cssHeight);
      ctx.stroke();
    }
    this.resetStyle();
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.fillStyle =
      this.background === "white" ? COLORS.white : COLORS.paper;
    ctx.fillRect(0, 0, w, h);

    if (this.background === "grid") {
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 48.5; x < w; x += 48) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 48.5; y < h; y += 48) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }

    if (this.background === "dot") {
      ctx.fillStyle = COLORS.dot;
      for (let x = 24; x < w; x += 24) {
        for (let y = 24; y < h; y += 24) {
          ctx.fillRect(x, y, 1.4, 1.4);
        }
      }
    }
  }

  private redraw(): void {
    const ctx = this.ctx;
    if (!ctx || this.cssWidth <= 1 || this.cssHeight <= 1) return;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(ctx);

    for (const stroke of this.strokes) {
      const points = stroke.points;
      if (points.length === 0) continue;
      this.styleFor(stroke);
      ctx.beginPath();
      ctx.moveTo(points[0].x * this.cssWidth, points[0].y * this.cssHeight);

      if (points.length === 1) {
        ctx.arc(
          points[0].x * this.cssWidth,
          points[0].y * this.cssHeight,
          Math.max(0.75, this.toPx(stroke.size) / 2),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else {
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(
            points[i].x * this.cssWidth,
            points[i].y * this.cssHeight,
          );
        }
        ctx.stroke();
      }
      this.resetStyle();
    }

    ctx.restore();
  }

  private emit(): void {
    this.onChange?.({
      count: this.strokes.length,
      canUndo: this.history.length > 0,
      canRedo: this.redoStack.length > 0,
    });
  }
}
