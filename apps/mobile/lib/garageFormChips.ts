import type { UserCarCondition, UserCarStatus } from "@hotwheels/shared";
import { theme } from "./theme";

/** Selected pill colors for garage status — aligns with My Garage row pills */
export const garageStatusChipTint: Record<
  UserCarStatus,
  { border: string; background: string; text: string }
> = {
  Owned: {
    border: theme.officialText,
    background: theme.officialBg,
    text: theme.officialText,
  },
  Want: {
    border: theme.rlcText,
    background: theme.rlcBg,
    text: theme.rlcText,
  },
  Duplicate: {
    border: theme.communityText,
    background: theme.communityBg,
    text: theme.communityText,
  },
};

/** Selected pill colors for packaging condition — distinct from status (teal / amber / violet) */
export const garageConditionChipTint: Record<
  UserCarCondition,
  { border: string; background: string; text: string }
> = {
  Carded: {
    border: theme.accentSecondary,
    background: "rgba(45, 212, 191, 0.16)",
    text: theme.accentSecondary,
  },
  Loose: {
    border: theme.rumorText,
    background: theme.rumorBg,
    text: theme.rumorText,
  },
  Custom: {
    border: theme.sthText,
    background: theme.sthBg,
    text: theme.sthText,
  },
};
