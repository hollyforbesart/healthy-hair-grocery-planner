/**
 * Small inline line icons (no icon library). They inherit the text colour
 * and are decorative: pair each with visible text.
 */
export type IconName = 'basket' | 'bowl' | 'share' | 'plusSquare' | 'dots' | 'install' | 'phone' | 'offline' | 'check' | 'clock' | 'moon' | 'calendar';

const PATHS: Record<IconName, JSX.Element> = {
  basket: (
    <>
      <path d="M4 10h16l-1.6 8.4a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6z" />
      <path d="M9 10 12 4l3 6" />
      <path d="M9.5 14v2.5M14.5 14v2.5" />
    </>
  ),
  bowl: (
    <>
      <path d="M3 12h18a9 8 0 0 1-18 0z" />
      <path d="M8 8c0-1.4 1-1.8 1-3.2M12 8c0-1.4 1-1.8 1-3.2M16 8c0-1.4 1-1.8 1-3.2" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M6 11H5v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8h-1" />
    </>
  ),
  plusSquare: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  dots: (
    <>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    </>
  ),
  install: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M12 7v5M9.5 9.5 12 12l2.5-2.5" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  offline: (
    <>
      <path d="M5 12.5a10 10 0 0 1 4-2.3M15 10.2a10 10 0 0 1 4 2.3" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
      <path d="m3 3 18 18" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  moon: <path d="M19.5 14.2A7.5 7.5 0 1 1 9.8 4.5a6 6 0 0 0 9.7 9.7Z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8 14h2M14 14h2M8 17.5h2" />
    </>
  ),
};

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
