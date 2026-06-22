import { useState, type CSSProperties } from "react";
import logoUrl from "@/assets/tempokey-logo.png";

/**
 * Single source of truth for the TempoKey brand mark.
 *
 * Why this component exists
 * ─────────────────────────
 * The previous code referenced the logo through an absolute Lovable CDN URL
 * (`/__l5e/assets-v1/...`). That URL resolves on the web, but inside the
 * Android APK WebView there is no host serving it — the request 404s and
 * Android renders the system "broken image" placeholder.
 *
 * The fix is two-layered:
 *  1. The PNG is now a real file in `src/assets/`, imported through Vite so
 *     it is hashed and copied into `dist/android/assets/…` with a relative
 *     URL that works inside the APK as well as on the web.
 *  2. If, for any reason, the image still fails to load (corrupted file,
 *     bundler regression, future asset migration…), we fall back to an
 *     inline SVG approximation of the logo. The user never sees a broken
 *     image icon.
 *
 * Sizing / spacing / animations are driven entirely by `className` / `style`
 * on the call site — this component only owns the source.
 */

interface TempoKeyLogoProps {
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

export function TempoKeyLogo({
  className,
  style,
  alt = "TempoKey",
}: TempoKeyLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <svg
        viewBox="0 0 128 128"
        role="img"
        aria-label={alt}
        className={className}
        style={style}
      >
        {/* Sound-wave bars on the left */}
        <g fill="#1E2A52">
          <rect x="14" y="60" width="4" height="8" rx="2" />
          <rect x="24" y="54" width="4" height="20" rx="2" />
          <rect x="34" y="46" width="4" height="36" rx="2" />
          <rect x="44" y="38" width="4" height="52" rx="2" />
          <rect x="54" y="30" width="4" height="68" rx="2" />
          <rect x="64" y="22" width="4" height="84" rx="2" />
        </g>
        {/* Half-disc segmented on the right */}
        <path
          d="M74 22 A42 42 0 0 1 116 64 L74 64 Z"
          fill="#1E2A52"
        />
        <path
          d="M74 64 L116 64 A42 42 0 0 1 74 106 Z"
          fill="#6B7A99"
        />
        <g stroke="#FFFFFF" strokeWidth="2.5" fill="none">
          <line x1="93" y1="22.5" x2="93" y2="106" />
          <line x1="74" y1="64" x2="116" y2="64" />
          <line x1="106" y1="29.5" x2="84" y2="98.5" />
          <line x1="84" y1="29.5" x2="106" y2="98.5" />
        </g>
      </svg>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export default TempoKeyLogo;
