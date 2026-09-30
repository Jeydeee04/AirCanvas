import type { JSX } from "react";

export type IconName =
  | "pen"
  | "marker"
  | "eraser"
  | "undo"
  | "redo"
  | "trash"
  | "download"
  | "sliders"
  | "help"
  | "close"
  | "camera"
  | "camera-off"
  | "draw"
  | "cycle"
  | "pause";

const PATHS: Record<IconName, JSX.Element> = {
  pen: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  marker: (
    <>
      <path d="M15.5 3.5a2.12 2.12 0 0 1 3 3L12 13l-3.5 1 1-3.5Z" />
      <path d="M4 21h16" />
      <path d="M8 17l-2 4" />
    </>
  ),
  eraser: (
    <>
      <path d="M8.5 21H4" />
      <path d="M14.5 3.5l6 6a1.5 1.5 0 0 1 0 2.1L11.6 20.5a1.5 1.5 0 0 1-1.1.5H7l-3.5-3.5a1.5 1.5 0 0 1 0-2.1l9.9-9.9a1.5 1.5 0 0 1 1.1 0Z" />
      <path d="M9.5 8l6.5 6.5" />
    </>
  ),
  undo: (
    <>
      <path d="M4 8h11a5 5 0 0 1 0 10h-4" />
      <path d="M8 4 4 8l4 4" />
    </>
  ),
  redo: (
    <>
      <path d="M20 8H9a5 5 0 0 0 0 10h4" />
      <path d="m16 4 4 4-4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 4h4a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 20h16" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h5M15 7h5M4 17h9M19 17h1" />
      <circle cx="12" cy="7" r="2.5" />
      <circle cx="16" cy="17" r="2.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4A2.5 2.5 0 1 1 12 12.8V14" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  camera: (
    <>
      <path d="M3.5 7.5h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
      <path d="m15.5 11 5-2.5v7L15.5 13z" />
    </>
  ),
  "camera-off": (
    <>
      <path d="M4 7.5h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
      <path d="m15.5 11 4-2v6" />
      <path d="m4 4 16 16" />
    </>
  ),
  draw: (
    <>
      <circle cx="9.5" cy="14.5" r="4" />
      <path d="M13 11l6.5-6.5" />
      <path d="M16.5 4.5H20V8" />
    </>
  ),
  cycle: (
    <>
      <path d="M4 9h12l-3.2-3.2" />
      <path d="M20 15H8l3.2 3.2" />
    </>
  ),
  pause: <path d="M9.5 5v14M14.5 5v14" />,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
