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
 * Reference (HEX): Primary `#E8222C`, Field `#3B9BFF`, Track orange `#FF7A1A`, racing yellow
 * `#FFD400` (`accentYellow` / `trackYellow`, pair labels with `textOnYellow`), BG `#050D1A`,
 * Surface `#0C2038`, Text `#F5F8FC` / `#A9C3E6`, Border `#1B4273`.
 * Errors: `danger` + `dangerSurface` / `dangerBorder`. Hero strip: `heroWashGradientColors`.
 */
import { Platform, type TextStyle } from "react-native";

/** Flame / primary CTA — logo red */
export const brand = {
  primary: "#E8222C",
  primaryHover: "#F2454D",
  primaryPressed: "#C2141E",
  primaryDisabled: "rgba(232, 34, 44, 0.38)",
  primaryMuted: "rgba(232, 34, 44, 0.18)",
} as const;

/** Sky / chrome UI — headers, links, secondary emphasis */
export const field = {
  main: "#3B9BFF",
  outlineHoverFill: "rgba(59, 155, 255, 0.14)",
  outlinePressedFill: "rgba(59, 155, 255, 0.24)",
  focusRing: "#3B9BFF",
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
  background: "#050D1A",
  backgroundAlt: "#0A1A30",
  panel: "#0C2038",
  raised: "#12305A",
} as const;

export const packagingText = {
  primary: "#F5F8FC",
  secondary: "#A9C3E6",
  /** Use at ~60% opacity on controls for disabled */
  disabled: "#5C6F86",
  /** Placeholders / tertiary meta */
  muted: "#7C96BA",
  onYellow: "#0A0F14",
} as const;

export const packagingBorder = {
  default: "#1B4273",
  strong: "#2A63B8",
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
export const focusRingShadow = "0 0 0 2px #050D1A, 0 0 0 4px #3B9BFF";

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

  thBg: "#3A2A05",
  thBorder: "#F2B90F",
  thText: "#FFD75A",

  sthBg: "#2B1250",
  sthBorder: "#A855F7",
  sthText: "#EBD8FF",

  rlcBg: "#0A1F3D",
  rlcBorder: "#3B9BFF",
  rlcText: "#CFE4FF",

  officialBg: "#0B3A1E",
  officialText: "#6EE7A0",

  /** "Owned" pill — bright green outline on deep green */
  ownedBg: "#0B3A1E",
  ownedBorder: "#22C55E",
  ownedText: "#D6FBE2",

  /** Catalog tile: panel gradient + electric outline */
  tileGradientColors: ["#0E2A4E", "#081A30"] as const,
  tileBorder: "#1F5FBF",
  /** Bottom nav plate sitting on the tire tread */
  navPlate: "rgba(6, 14, 28, 0.88)",
  navInactive: "#9CC4FF",

  communityBg: "#22252E",
  communityText: "#B8BCC8",

  rumorBg: "#3D2818",
  rumorText: "#F0B87A",

  danger: "#F87171",
  dangerBorder: "rgba(248, 113, 113, 0.35)",
  dangerSurface: "rgba(248, 113, 113, 0.12)",

  /** Hero wash — top of strip fades into app bg (`theme.bg`) */
  heroWashGradientColors: ["rgba(59, 155, 255, 0.2)", "rgba(5, 13, 26, 0)"] as const,

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
