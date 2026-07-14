"use client";

// UI primitives — the single source of styling truth. Every page composes
// these; theme variants (light/dark) live here and nowhere else.

import { forwardRef } from "react";
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "./icons";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none",
        className
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "success" | "danger" | "ghost" | "warning";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-sky-600 text-white hover:bg-sky-500 focus-visible:outline-sky-600",
  success: "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:outline-emerald-600",
  danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600",
  warning: "bg-orange-500 text-white hover:bg-orange-400 focus-visible:outline-orange-500",
  ghost:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "md" | "lg";
    loading?: boolean;
  }
>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "w-full px-6 py-4 text-lg font-bold",
        BUTTON_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {/* text-current: the arc inherits the button's own text colour */}
      {loading && <Spinner size="sm" className="text-current" />}
      {children}
    </button>
  );
});

/* --------------------------------- Field ---------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-600 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cx(
          "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900",
          "placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500",
          "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600",
          "disabled:opacity-50",
          className
        )}
        {...rest}
      />
    );
  }
);

/* --------------------------------- Badge ---------------------------------- */

type BadgeTone = "green" | "yellow" | "orange" | "red" | "slate" | "sky";

const BADGE_TONES: Record<BadgeTone, string> = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
};

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Threshold state → badge tone, shared by every page that shows river states. */
export const THRESHOLD_TONE: Record<string, BadgeTone> = {
  normal: "green",
  alert: "yellow",
  warning: "orange",
  danger: "red",
  unknown: "slate",
};

/* --------------------------------- Alert ---------------------------------- */

type AlertVariant = "error" | "warning" | "info" | "success";

const ALERT_VARIANTS: Record<AlertVariant, { box: string; icon: React.ReactNode }> = {
  error: {
    box: "border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
    icon: <XCircleIcon size={18} />,
  },
  warning: {
    box: "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200",
    icon: <AlertTriangleIcon size={18} />,
  },
  info: {
    box: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
    icon: <InfoIcon size={18} />,
  },
  success: {
    box: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    icon: <CheckCircleIcon size={18} />,
  },
};

export function Alert({
  variant,
  title,
  children,
  action,
}: {
  variant: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const v = ALERT_VARIANTS[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cx("rounded-xl border p-4 text-sm", v.box)}>
      <div className="flex gap-3">
        <span aria-hidden className="mt-0.5 shrink-0">
          {v.icon}
        </span>
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cx(title && "mt-1", "leading-relaxed opacity-90")}>{children}</div>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Spinner --------------------------------- */

const SPINNER_SIZE = { sm: 16, md: 24, lg: 40 } as const;

/**
 * SVG arc spinner: a faded full-circle track + a solid quarter arc in
 * currentColor. Unlike the border-color trick, the rotating arc stays
 * visible in every theme and inside any button variant.
 */
export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const px = SPINNER_SIZE[size];
  return (
    <span role="status" aria-label="loading" className={cx("inline-flex text-sky-500", className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/* -------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
    />
  );
}

/* ------------------------------- EmptyState ------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-slate-400 dark:text-slate-600" aria-hidden>
        {icon}
      </span>
      <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
