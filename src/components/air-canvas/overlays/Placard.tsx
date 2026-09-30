"use client";

interface PlacardProps {
  toolLabel: string;
  colorName: string;
  colorHex: string;
  strokes: number;
  elapsed: number;
  gesture: string | null;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="eyebrow text-[0.58rem] text-ink-faint">{label}</dt>
      <dd className="telemetry text-ink">{value}</dd>
    </div>
  );
}

export function Placard({
  toolLabel,
  colorName,
  colorHex,
  strokes,
  elapsed,
  gesture,
}: PlacardProps) {
  const year = new Date().getFullYear();

  return (
    <aside className="panel anim-rise pointer-events-none absolute right-5 top-16 z-20 w-[13.5rem] px-4 py-4">
      <p className="eyebrow text-[0.6rem]">Now showing</p>
      <h3 className="display mt-2 text-[2rem]">Untitled</h3>

      <div className="my-3 h-px bg-hairline" />

      <dl className="space-y-1.5">
        <Row label="Medium" value={toolLabel} />
        <Row
          label="Colour"
          value={
            <span className="flex items-center justify-end gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-hairline-strong"
                style={{ backgroundColor: colorHex }}
              />
              {colorName}
            </span>
          }
        />
        <Row label="Strokes" value={String(strokes).padStart(3, "0")} />
        <Row label="Session" value={formatTime(elapsed)} />
        <Row
          label="Gesture"
          value={gesture ? gesture.replace("_", " ").toLowerCase() : "—"}
        />
      </dl>

      <div className="my-3 h-px bg-hairline" />

      <p className="eyebrow text-[0.52rem] text-ink-faint">
        Air Canvas · {year}
      </p>
    </aside>
  );
}
