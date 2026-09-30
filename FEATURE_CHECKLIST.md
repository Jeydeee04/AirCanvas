# Air Canvas — Feature Checklist

A prioritized backlog of what's planned next. Check items off as they ship.
Legend: 🔥 next up · 🧪 experiment · 📦 needs design

---

## 🖐 Gesture control

- [ ] 🔥 **Closed_Fist = eraser** — quick temporary eraser without cycling tools
- [ ] **Thumb_Up = undo / Thumb_Down = redo** — history without leaving the canvas
- [ ] 📦 **Two-hand mode** (`numHands: 2`) — pinch-zoom/rotate the canvas, non-drawing hand becomes a live floating palette
- [ ] 🧪 **Custom gesture training** — teach a personal sign (e.g. a signature flourish) via `customGesturesClassifierOptions` to stamp or auto-fill
- [ ] **Calibration step** — set a comfortable drawing zone and reach range on first run
- [ ] **Gesture confidence meter** — live score bar + adjustable threshold in Settings
- [ ] **Handedness preference** — prioritize left/right hand when two are visible

## 🎨 Canvas & drawing

- [ ] 🔥 **Brush opacity control** — per-tool alpha, real translucent ink
- [ ] **Stroke smoothing slider** — catmull-rom interpolation for cleaner lines
- [ ] **Shape tools** — line / rectangle / ellipse with press-and-hold or two-point gestures
- [ ] **Zoom & pan** — scroll-wheel and pinch-two-hand navigation of the paper
- [ ] 📦 **Layers** — sketch layer under ink layer, toggle visibility, clear one layer
- [ ] **More backgrounds** — ruled lines, isometric, custom uploaded image
- [ ] **Eyedropper** — pick a colour back off the canvas
- [ ] **Fill / bucket** — flood-fill closed regions (SVG path aware)

## 💾 Persistence & sharing

- [ ] 🔥 **Gallery** — save, thumbnail and reopen artworks (localStorage → IndexedDB)
- [ ] **Autosave & recovery** — draft restored after refresh or crash
- [ ] **SVG export** — vector output alongside PNG (stroke buffer already supports it)
- [ ] **Timelapse replay** — re-animate the stroke buffer as a drawing-in-progress; export WebM/GIF
- [ ] **Share link** — encode strokes into a URL, or Web Share API on mobile
- [ ] **Copy to clipboard** — PNG straight to the paste buffer

## ✨ UX & design

- [ ] 🔥 **Fullscreen presentation mode** — hide every HUD element for showcase/drawing only
- [ ] **Editable placard title** — name the work instead of "Untitled"
- [ ] **Command palette (⌘K)** — keyboard access to every tool and action
- [ ] 📦 **Second theme** — dark studio mode alongside warm paper
- [ ] **Onboarding replay** — reopen the gesture tutorial from Help
- [ ] **Sound feedback toggle** — subtle cues on tool switch / clear / save

## ⚙️ Performance & robustness

- [ ] **Adaptive inference throttle** — cap detection FPS on low-end devices
- [ ] 🧪 **Off-thread inference** — move MediaPipe into a Web Worker
- [ ] **Self-hosted WASM** — ship `tasks-vision` wasm from `/public` instead of the CDN
- [ ] **PWA / offline caching** — service worker so the studio works without a network

## ♿ Accessibility

- [ ] **Keyboard cursor driving** — arrow keys move the air cursor, Enter/Space draws
- [ ] **Screen-reader announcements** — polite live region for tool, colour and camera changes
- [ ] **High-contrast mode** — stronger hairlines and UI text

## 🧪 Testing & project

- [ ] **Unit tests** — drawing engine: undo/redo, eraser batches, resize replay, export
- [ ] **Playwright smoke test** — page boots, mouse draws, panels open
- [ ] **README rewrite** — screenshots, gesture guide, shortcuts table
- [ ] **Deploy** — production build on Vercel with OG image

---

### Recently shipped (for reference)

- [x] Full-viewport canvas with vellum overlay panels
- [x] MediaPipe `GestureRecognizer` (pinch draw · Victory cycle · palm pause)
- [x] Stroke-buffer engine: pen / marker / eraser, undo-redo, PNG export
- [x] Poppins + Bebas Neue type system on a warm paper palette
- [x] Onboarding, settings, help, toasts, camera PiP, mouse fallback
- [x] **Left/right hand tracking fixed** — mirror mapping now follows the hand and matches the PiP preview
- [x] **Partial eraser** — nibbles lines at brush width instead of deleting whole strokes (one undo per eraser gesture)
- [x] **Clean erasing** — sweeps the full drag path (no stripes on fast swipes), widens the disc per stroke so fat markers clear in one pass, drops 1-point debris fragments, bbox fast-reject for speed
- [x] React 19 style-conflict fix (shorthand `border` vs `borderColor` in the air cursor)
