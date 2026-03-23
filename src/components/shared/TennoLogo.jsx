import React from "react";

/**
 * TennoLogo — inline SVG "Vault" logo
 * 
 * Props:
 *   variant  "recovery" | "group"   — wordmark subtitle
 *   size     "sm" | "md" | "lg" | "icon"
 *   light    boolean — light variant for light backgrounds (portal pages)
 *   className string
 */
export default function TennoLogo({ variant = "recovery", size = "md", light = false, className = "" }) {
  const sizes = {
    sm:   { width: 140 },
    md:   { width: 200 },
    lg:   { width: 300 },
    icon: { width: 40 },
  };

  const w = (sizes[size] || sizes.md).width;
  const isIconOnly = size === "icon";
  const isGroup = variant === "group";

  // Color tokens
  const diamond   = light ? "#444"   : "#aaa";
  const hatch     = light ? "#999"   : "#666";
  const hatchMid  = light ? "#bbb"   : "#777";
  const cutout    = light ? "#f8f8f8": "#0d1117";
  const wordmark  = light ? "#1a1a1a": "#cccccc";
  const sub       = light ? "#777"   : "#666";

  if (isIconOnly) {
    return (
      <svg
        viewBox="0 0 84 88"
        width={w}
        height={w}
        className={className}
        aria-label="TENNO"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Diamond outline */}
        <polygon points="42,2 82,44 42,86 2,44" stroke={diamond} strokeWidth="1.4" fill="none" />
        {/* Hatching lines */}
        <line x1="20" y1="23" x2="60" y2="23" stroke={hatch}    strokeWidth="0.5" />
        <line x1="14" y1="33" x2="68" y2="33" stroke={hatch}    strokeWidth="0.5" />
        <line x1="8"  y1="44" x2="76" y2="44" stroke={hatchMid} strokeWidth="0.6" />
        <line x1="14" y1="55" x2="68" y2="55" stroke={hatch}    strokeWidth="0.5" />
        <line x1="20" y1="65" x2="60" y2="65" stroke={hatch}    strokeWidth="0.5" />
        {/* T cutout — crossbar */}
        <rect x="29" y="18" width="26" height="6" fill={cutout} />
        {/* T cutout — stem */}
        <rect x="38" y="18" width="8" height="52" fill={cutout} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 420 88"
      width={w}
      className={className}
      aria-label={`TENNO ${isGroup ? "GROUP" : "RECOVERY"}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Diamond outline */}
      <polygon points="42,2 82,44 42,86 2,44" stroke={diamond} strokeWidth="1.2" fill="none" />
      {/* Hatching lines */}
      <line x1="20" y1="23" x2="60" y2="23" stroke={hatch}    strokeWidth="0.4" />
      <line x1="14" y1="33" x2="68" y2="33" stroke={hatch}    strokeWidth="0.4" />
      <line x1="8"  y1="44" x2="76" y2="44" stroke={hatchMid} strokeWidth="0.5" />
      <line x1="14" y1="55" x2="68" y2="55" stroke={hatch}    strokeWidth="0.4" />
      <line x1="20" y1="65" x2="60" y2="65" stroke={hatch}    strokeWidth="0.4" />
      {/* T cutout — crossbar */}
      <rect x="29" y="18" width="26" height="6" fill={cutout} />
      {/* T cutout — stem */}
      <rect x="38" y="18" width="8" height="52" fill={cutout} />
      {/* Wordmark */}
      <text
        x="100"
        y="50"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fontWeight="300"
        fontSize="30"
        fill={wordmark}
        letterSpacing="10"
      >
        TENNO
      </text>
      {/* Subtext */}
      <text
        x="101"
        y="70"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fontWeight="200"
        fontSize="11"
        fill={sub}
        letterSpacing="7"
      >
        {isGroup ? "GROUP" : "RECOVERY"}
      </text>
    </svg>
  );
}