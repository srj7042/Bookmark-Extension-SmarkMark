/** Inline SVG icon set — hand-drawn so the extension ships with zero icon dependencies. */
import type { JSX, SVGProps } from 'react'

const PATHS: Record<string, JSX.Element> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5 21 21" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6.1-5.4-3-5.4 3 1.2-6.1L3.3 9.9l6.1-.8z" />,
  bookmark: <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-5-6.5 5v-16a1 1 0 0 1 1-1z" />,
  folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h3.4l2 2.2h7.6a2 2 0 0 1 2 2v8.3a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />,
  tag: (
    <>
      <path d="M20.4 13.2 12.6 21l-9.1-9.1V3.9h8z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4.5 12.5 9.5 17.5 20 6.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevronDown: <path d="M5.5 9.5 12 16l6.5-6.5" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1.2" />
      <circle cx="4" cy="12" r="1.2" />
      <circle cx="4" cy="18" r="1.2" />
    </>
  ),
  download: <path d="M12 3.5v11M7.5 10 12 14.5 16.5 10M4 20.5h16" />,
  upload: <path d="M12 20.5v-11M7.5 14 12 9.5 16.5 14M4 3.5h16" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </>
  ),
  moon: <path d="M20.5 13.2A8.6 8.6 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z" />,
  alert: (
    <>
      <path d="M12 3.5 21 20H3z" />
      <path d="M12 9.5v4.2M12 17h.01" />
    </>
  ),
  sparkle: <path d="M12 3.5l1.9 5.3 5.3 1.9-5.3 1.9L12 18l-1.9-5.4-5.3-1.9 5.3-1.9z" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17.5 14.5v4a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5V8a1.5 1.5 0 0 1 1.5-1.5h4" />,
  edit: <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM15.5 5.5l3 3" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  filter: <path d="M3.5 5h17l-6.6 7.6V20l-3.8-2v-5.4z" />,
  home: <path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1h-4.8v-6H9.3v6H4.5a1 1 0 0 1-1-1z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5v-4a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4" />
    </>
  ),
  undo: <path d="M9.5 14.5 4.5 9.5l5-5M4.5 9.5h9.5a5.5 5.5 0 0 1 0 11H8.5" />,
  layers: <path d="M12 3.5 3.5 8 12 12.5 20.5 8zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5" />,
  inbox: <path d="M3.5 12.5h5l1.2 2.8h4.6l1.2-2.8h5M5.5 4.5h13l2.5 8v6.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V12.5z" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" />,
  sort: <path d="M4 7h11M4 12h8M4 17h5M17 6.5v11M14 14.5l3 3 3-3" />,
  collection: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="M3.5 10h17M9 5.5v13" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 8h.01" />
    </>
  ),
}

export function Icon({ name, size = 18, ...rest }: { name: keyof typeof PATHS | string; size?: number } & SVGProps<SVGSVGElement>) {
  const glyph = PATHS[name] ?? PATHS.info
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {glyph}
    </svg>
  )
}
