import { Platform } from "react-native";

/**
 * Design tokens — "technical minimalist, engineered precision".
 *
 * Contrast (WCAG 2.1) against `background` / `surface`:
 *   text 18.1 / 17.0 · textSecondary 7.8 / 7.3 · textMuted 6.1 / 5.8 · accent 9.3 / 8.7
 * `onAccent` on `accent` is 9.3:1 (7.2:1 on `accentHover`), so filled
 * buttons pass AA in every state. Depth comes from 1px hairline borders, not
 * shadows.
 */
export const colors = {
  /** Obsidian Void */
  background: "#09090B",
  /** Matte Graphite */
  surface: "#121215",
  surfaceRaised: "#18181B",
  surfaceHover: "#1F1F23",
  /** Hairline border */
  border: "#27272A",
  borderStrong: "#3F3F46",

  /** Crisp Alabaster */
  text: "#F4F4F5",
  /** Muted Slate */
  textSecondary: "#A1A1AA",
  /** Hints and placeholders; still AA (6.1:1). */
  textMuted: "#8E8E96",

  /** Electric Cyan */
  accent: "#38BDF8",
  accentHover: "#0EA5E9",
  accentPressed: "#0284C7",
  accentSoft: "rgba(56, 189, 248, 0.10)",
  accentBorder: "rgba(56, 189, 248, 0.40)",
  onAccent: "#09090B",

  success: "#3FD68F",
  successSoft: "rgba(63, 214, 143, 0.12)",
  warning: "#F2B84B",
  warningSoft: "rgba(242, 184, 75, 0.12)",
  danger: "#FF6B70",
  dangerSoft: "rgba(255, 107, 112, 0.12)",
  dangerBorder: "rgba(255, 107, 112, 0.40)",
  live: "#FF4D5E",
} as const;

/** 8pt grid (with a 4pt half-step for tight inline spacing). */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  /** Vertical rhythm between page sections (80–112px). */
  section: 80,
  sectionWide: 112,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Loaded in App.tsx. Each weight is its own family because Android can't
 * pick a weight out of a custom font with `fontWeight`.
 */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  mono: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

/**
 * Type scale. Headings track tight (-0.025em); body is 16px on a 1.6 line
 * height; tags, codes and telemetry use JetBrains Mono at 13px, +0.02em.
 */
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.85 },
  title: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.425 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26, letterSpacing: 0 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, letterSpacing: 0 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  /** Tags and section labels. */
  overline: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.26,
    textTransform: "uppercase" as const,
  },
  /** Timestamps, counts and other telemetry. */
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, letterSpacing: 0.26 },
  code: { fontFamily: fonts.monoBold, fontSize: 40, lineHeight: 48, letterSpacing: 6 },
} as const;

/** Body copy line length cap (~65ch at 16px Inter). */
export const readableWidth = 560;

/** Minimum touch target (WCAG 2.5.5 / platform guidelines). */
export const touchTarget = 44;

/** Breakpoint where screens switch from stacked to side-by-side layouts. */
export const wideBreakpoint = 900;

/** Native driver isn't available for transforms on web. */
export const useNativeDriver = Platform.OS !== "web";
