/**
 * Hot Wheels Spotter — packaging-inspired UI tokens (50-pack box art).
 *
 * Semantic groups:
 * - `brand` — flame / primary CTA (logo red)
 * - `field` — electric sky blue (chrome UI, links, hunt intel)
 * - `track` — orange, yellow, green, purple toy accents
 * - `packagingSurface` / `packagingText` / `packagingBorder` — navy stack & readability
 *
 * The default `theme` object maps these to stable keys (`bg`, `accent`, …) so screens
 * stay unchanged. Use `themeLight` when adding an appearance toggle.
 *
 * Reference (HEX): Primary `#D81E2A`, Field `#1FA6F0`, Track orange `#FF7A1A`, racing yellow
 * `#FFD400` (`accentYellow` / `trackYellow`, pair labels with `textOnYellow`), BG `#071422`,
 * Surface `#132A45`, Text `#F5F8FC` / `#A8BDD4`, Border `#2A4566`.
 * Errors: `danger` + `dangerSurface` / `dangerBorder`. Hero strip: `heroWashGradientColors`.
 */
import { Platform, type TextStyle } from "react-native";

/** Flame / primary CTA — logo red */
export const brand = {
  primary: "#D81E2A",
  primaryHover: "#E63E48",
  primaryPressed: "#B81522",
  primaryDisabled: "rgba(216, 30, 42, 0.38)",
  primaryMuted: "rgba(216, 30, 42, 0.18)",
} as const;

/** Sky / chrome UI — headers, links, secondary emphasis */
export const field = {
  main: "#1FA6F0",
  outlineHoverFill: "rgba(31, 166, 240, 0.12)",
  outlinePressedFill: "rgba(31, 166, 240, 0.22)",
  focusRing: "#1FA6F0",
} as const;

/** Track & toy accents */
export const track = {
  orange: "#FF7A1A",
  orangeHover: "#FF9447",
  orangePressed: "#E8680F",
  yellow: "#FFD400",
  green: "#0F8F5F",
  purple: "#7C4DFF",
} as const;

/** Navy stack — app backgrounds & panels */
export const packagingSurface = {
  background: "#071422",
  backgroundAlt: "#0C1E32",
  panel: "#132A45",
  raised: "#1A3554",
} as const;

export const packagingText = {
  primary: "#F5F8FC",
  secondary: "#A8BDD4",
  /** Use at ~60% opacity on controls for disabled */
  disabled: "#5C6F86",
  /** Placeholders / tertiary meta */
  muted: "#7D93AD",
  onYellow: "#0A0F14",
} as const;

export const packagingBorder = {
  default: "#2A4566",
  strong: "#3D5A80",
  sticker: "rgba(232, 240, 250, 0.14)",
} as const;

/** Gloss / divider glint — not for long-form text */
export const chrome = {
  highlight: "#B9C8D9",
} as const;

/** CSS gradient direction + stops (web or expo-linear-gradient) */
export const gradients = {
  trackStrip: "135deg, #FF8F3A 0%, #E85A00 100%",
  skyHero: "180deg, #2BB4FF 0%, #0F6BB8 100%",
  /** Overlay on primary button top third (web / Skia) */
  flameButtonGloss: "180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%",
} as const;

/** Focus ring on dark bg (web): outer bg, then field ring */
export const focusRingShadow = "0 0 0 2px #071422, 0 0 0 4px #1FA6F0";

/** Light “toy aisle” mode — swap root theme when implementing appearance */
export const themeLight = {
  bg: "#E3F2FF",
  bgElevated: "#FFFFFF",
  bgSubtle: "#CBE9FF",
  text: "#0A1628",
  textSecondary: "#3D4F66",
  textMuted: "#5C7088",
  border: "#B8D4EB",
  borderStrong: "#8FB8D9",
  primary: brand.primary,
  primaryPressed: brand.primaryPressed,
  field: field.main,
  accentOrange: track.orange,
  accentYellow: track.yellow,
  dangerBorder: "rgba(220, 38, 38, 0.35)",
  dangerSurface: "rgba(220, 38, 38, 0.08)",
  heroWashGradientColors: ["rgba(31, 166, 240, 0.22)", "rgba(227, 242, 255, 0)"] as const,
} as const;

export const theme = {
  bg: packagingSurface.background,
  bgElevated: packagingSurface.panel,
  bgSubtle: packagingSurface.backgroundAlt,
  /** Nested plastic depth (cards on panels) */
  bgRaised: packagingSurface.raised,

  border: packagingBorder.default,
  borderStrong: packagingBorder.strong,
  borderSticker: packagingBorder.sticker,

  text: packagingText.primary,
  textSecondary: packagingText.secondary,
  textMuted: packagingText.muted,
  /** Search / form placeholders on dark surfaces — clearer than `textMuted` */
  inputPlaceholder: "#9EB2C8",

  accent: brand.primary,
  accentHover: brand.primaryHover,
  accentPressed: brand.primaryPressed,
  accentDisabled: brand.primaryDisabled,
  accentMuted: brand.primaryMuted,
  accentSecondary: field.main,
  /** Selected chrome / filter chips — pairs with `accentSecondary` */
  accentSecondaryMuted: field.outlineHoverFill,

  trackOrange: track.orange,
  trackOrangeHover: track.orangeHover,
  trackOrangePressed: track.orangePressed,
  /** Racing yellow — logo / kickers / badges; use `textOnYellow` on yellow fills */
  trackYellow: track.yellow,
  accentYellow: track.yellow,
  accentYellowMuted: "rgba(255, 212, 0, 0.18)",
  trackGreen: track.green,
  trackPurple: track.purple,
  textOnYellow: packagingText.onYellow,
  chromeHighlight: chrome.highlight,

  thBg: "#3D3518",
  thBorder: "#C9A227",
  thText: "#F5E6A8",

  sthBg: "#2A2240",
  sthBorder: "#9B7FD6",
  sthText: "#E8D9FF",

  rlcBg: "#1A2838",
  rlcBorder: "#4A7AB0",
  rlcText: "#B8D4F0",

  officialBg: "#14291C",
  officialText: "#7FD99A",

  communityBg: "#22252E",
  communityText: "#B8BCC8",

  rumorBg: "#3D2818",
  rumorText: "#F0B87A",

  danger: "#F87171",
  dangerBorder: "rgba(248, 113, 113, 0.35)",
  dangerSurface: "rgba(248, 113, 113, 0.12)",

  /** Hero wash — top of strip fades into app bg (`theme.bg`) */
  heroWashGradientColors: ["rgba(43, 180, 255, 0.2)", "rgba(7, 20, 34, 0)"] as const,

  radiusSm: 8,
  radiusMd: 14,
  radiusLg: 20,
  radiusFull: 999,

  spaceXs: 4,
  spaceSm: 8,
  spaceMd: 12,
  spaceLg: 16,
  spaceXl: 24,
  space2xl: 32,
  space3xl: 40,

  /** Minimum tappable size (iOS HIG / Material ~48dp); use for hitSlop / min dimensions */
  touchTargetMin: 44,
  /** Max content width for wide web / tablet; phone stays full-bleed fluid */
  contentMaxWidthPhoneFirst: 560,
  /** Viewport width at or above this uses centered max-width column (progressive enhancement) */
  breakpointWide: 600,

  fontMono: "monospace" as const,

  /** Spread into Text — pair with `color` from theme */
  typeKicker: {
    fontSize: 12,
    fontWeight: "800" as TextStyle["fontWeight"],
    letterSpacing: 1.1,
    textTransform: "uppercase" as TextStyle["textTransform"],
  },
  typeTitleLg: {
    fontSize: 28,
    fontWeight: "900" as TextStyle["fontWeight"],
    letterSpacing: -0.4,
  },
  typeTitleMd: {
    fontSize: 22,
    fontWeight: "900" as TextStyle["fontWeight"],
    letterSpacing: -0.3,
  },
  /** Body copy: keep ≥16px on phone for readability without zoom */
  typeBody: {
    fontSize: 16,
    fontWeight: "500" as TextStyle["fontWeight"],
    lineHeight: 24,
  },
  typeMeta: {
    fontSize: 14,
    fontWeight: "500" as TextStyle["fontWeight"],
  },
  typeMono: {
    fontFamily: "monospace" as const,
    fontSize: 14,
    fontWeight: "600" as TextStyle["fontWeight"],
  },

  shadow: {
    card: Platform.select({
      web: { boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.35)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
} as const;

export type Theme = typeof theme;

/** iOS scroll indicators on dark surfaces */
export const themedScrollIndicatorProps = {
  indicatorStyle: "white" as const,
};

/**
 * Global scrollbar skin for react-native-web / browser.
 * Firefox: scrollbar-color; Chromium/Safari: -webkit-scrollbar.
 */
export const scrollbarWebCss = `
* {
  scrollbar-width: thin;
  scrollbar-color: ${theme.borderStrong} ${theme.bgElevated};
}
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
*::-webkit-scrollbar-track {
  background: ${theme.bgElevated};
}
*::-webkit-scrollbar-thumb {
  background: ${theme.borderStrong};
  border-radius: 6px;
  border: 2px solid ${theme.bgElevated};
}
@media (hover: hover) and (pointer: fine) {
  *::-webkit-scrollbar-thumb:hover {
    background: ${theme.accent};
  }
}
*::-webkit-scrollbar-corner {
  background: ${theme.bgElevated};
}
`.trim();
