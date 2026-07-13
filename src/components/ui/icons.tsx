// Inline SVG icon set — stroke-based, inherits currentColor, sized via prop.
// Path data follows the Lucide (ISC) geometry so icons are visually coherent.
// The web app uses ONLY these — no emoji glyphs in the UI.

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean;
}

function createIcon(name: string, children: React.ReactNode) {
  function Icon({ size = 16, className, strokeWidth = 2, ...rest }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden={rest["aria-hidden"] ?? true}
        focusable="false"
      >
        {children}
      </svg>
    );
  }
  Icon.displayName = `${name}Icon`;
  return Icon;
}

/* ------------------------------- brand & nav ------------------------------- */

export const WavesIcon = createIcon(
  "Waves",
  <>
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </>
);

export const SunIcon = createIcon(
  "Sun",
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </>
);

export const MoonIcon = createIcon("Moon", <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);

/* -------------------------------- statuses --------------------------------- */

export const CheckIcon = createIcon("Check", <path d="M20 6 9 17l-5-5" />);

export const CheckCircleIcon = createIcon(
  "CheckCircle",
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </>
);

export const AlertTriangleIcon = createIcon(
  "AlertTriangle",
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
);

export const XCircleIcon = createIcon(
  "XCircle",
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </>
);

export const InfoIcon = createIcon(
  "Info",
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>
);

export const ActivityIcon = createIcon(
  "Activity",
  <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
);

/* --------------------------------- actions --------------------------------- */

export const CameraIcon = createIcon(
  "Camera",
  <>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </>
);

export const MapPinIcon = createIcon(
  "MapPin",
  <>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </>
);

export const SendIcon = createIcon(
  "Send",
  <>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </>
);

export const XIcon = createIcon(
  "X",
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
);

export const UndoIcon = createIcon(
  "Undo",
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </>
);

export const RadioIcon = createIcon(
  "Radio",
  <>
    <circle cx="12" cy="12" r="2" />
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
    <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
  </>
);

/* ------------------------------ asset categories --------------------------- */

export const SnowflakeIcon = createIcon(
  "Snowflake",
  <>
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <path d="m4.93 4.93 14.14 14.14" />
    <path d="m19.07 4.93-14.14 14.14" />
    <path d="m9 4 3 2 3-2" />
    <path d="m9 20 3-2 3 2" />
  </>
);

export const PackageIcon = createIcon(
  "Package",
  <>
    <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
    <path d="M12 22V12" />
    <path d="m3.3 7 8.7 5 8.7-5" />
  </>
);

export const ZapIcon = createIcon(
  "Zap",
  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
);

export const ArmchairIcon = createIcon(
  "Armchair",
  <>
    <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
    <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z" />
    <path d="M5 18v2" />
    <path d="M19 18v2" />
  </>
);

export const FileTextIcon = createIcon(
  "FileText",
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </>
);

/* ------------------------------ transport/state ----------------------------- */

export const TruckIcon = createIcon(
  "Truck",
  <>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </>
);

export const LockIcon = createIcon(
  "Lock",
  <>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>
);
