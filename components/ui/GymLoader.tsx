"use client";

import { useMemo } from "react";

type Variant = "squat" | "curl" | "jog";
const VARIANTS: Variant[] = ["squat", "curl", "jog"];

function SquatFigure() {
  return (
    <svg width={56} height={56} viewBox="0 0 64 64" fill="none">
      <g className="origin-center animate-gym-bob">
        {/* barbell */}
        <g className="origin-center animate-gym-wobble">
          <rect x="6" y="12" width="6" height="10" rx="2" fill="#2FE38A" />
          <rect x="52" y="12" width="6" height="10" rx="2" fill="#2FE38A" />
          <rect x="12" y="15.5" width="40" height="3" rx="1.5" fill="#16171B" />
        </g>
        {/* head */}
        <circle cx="32" cy="26" r="6" fill="#16171B" />
        {/* torso */}
        <rect x="25" y="33" width="14" height="15" rx="5" fill="#16171B" />
        {/* bent legs (squat stance, drawn statically) */}
        <path
          d="M28 47 L22 54 L24 60"
          stroke="#16171B"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M36 47 L42 54 L40 60"
          stroke="#16171B"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function CurlFigure() {
  return (
    <svg width={56} height={56} viewBox="0 0 64 64" fill="none">
      {/* head */}
      <circle cx="30" cy="18" r="6" fill="#16171B" />
      {/* torso */}
      <rect x="24" y="25" width="13" height="20" rx="5" fill="#16171B" />
      {/* legs */}
      <line x1="27" y1="44" x2="25" y2="60" stroke="#16171B" strokeWidth="4" strokeLinecap="round" />
      <line x1="34" y1="44" x2="36" y2="60" stroke="#16171B" strokeWidth="4" strokeLinecap="round" />
      {/* still arm */}
      <line x1="24" y1="29" x2="18" y2="40" stroke="#16171B" strokeWidth="4" strokeLinecap="round" />
      {/* curling arm, pivoting at the elbow */}
      <g style={{ transformOrigin: "38px 30px" }} className="animate-gym-curl">
        <line x1="38" y1="30" x2="38" y2="44" stroke="#16171B" strokeWidth="4" strokeLinecap="round" />
        <circle cx="38" cy="46" r="5" fill="#2FE38A" />
      </g>
    </svg>
  );
}

function JogFigure() {
  return (
    <svg width={56} height={56} viewBox="0 0 64 64" fill="none">
      {/* motion dashes */}
      <rect x="6" y="30" width="8" height="3" rx="1.5" fill="#A3A5AC" className="animate-gym-dash" />
      <rect
        x="4"
        y="38"
        width="10"
        height="3"
        rx="1.5"
        fill="#A3A5AC"
        className="animate-gym-dash"
        style={{ animationDelay: "0.15s" }}
      />
      <g className="origin-bottom animate-gym-run-bounce" style={{ transformOrigin: "32px 60px" }}>
        <circle cx="34" cy="16" r="6" fill="#16171B" />
        <rect x="28" y="23" width="12" height="16" rx="5" fill="#16171B" />
        <path
          d="M30 26 L20 22"
          stroke="#16171B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M38 30 L46 34"
          stroke="#16171B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M31 39 L24 48 L30 60"
          stroke="#16171B"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M37 39 L44 46 L38 56"
          stroke="#16171B"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

const FIGURES: Record<Variant, () => React.ReactElement> = {
  squat: SquatFigure,
  curl: CurlFigure,
  jog: JogFigure,
};

export function GymLoader({
  variant,
  label,
  className,
}: {
  /** Omit to pick a random one each time this mounts - nice variety across
   * the app's various loading moments. */
  variant?: Variant;
  label?: string;
  className?: string;
}) {
  const picked = useMemo(
    () => variant ?? VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
    [variant]
  );
  const Figure = FIGURES[picked];

  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 ${className ?? ""}`}>
      <Figure />
      {label && <p className="text-[13px] font-medium text-ink-faint">{label}</p>}
    </div>
  );
}
