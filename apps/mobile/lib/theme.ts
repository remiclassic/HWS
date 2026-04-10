/**
 * Hot Wheels Spotter — premium dark garage / track aesthetic.
 * High-contrast surfaces; signal red primary; cyan accent for hunt intel.
 */
import type { TextStyle } from "react-native";

export const theme = {
  bg: "#0C0D10",
  bgElevated: "#14161C",
  bgSubtle: "#1B1E26",
  border: "#2A2E38",
  borderStrong: "#3D4352",

  text: "#F2F3F5",
  textSecondary: "#A8B0BF",
  textMuted: "#6B7287",

  accent: "#E32D2D",
  accentPressed: "#B82424",
  accentMuted: "rgba(227, 45, 45, 0.18)",
  accentSecondary: "#2DD4BF",

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
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 4,
    },
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
